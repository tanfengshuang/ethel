import logging
from Queue import Queue
from threading import Thread

from rhsm import connection
from M2Crypto.SSL import SSLError

import candlepin as env
import candlepin.utils as utils

__author__ = "tcoufal"


def __raw_get_data(username, password):
    """
    A Data retrieval procedure for given user account

    The function tires to retrieve account details based on given username and
    password. In case of failure it retries the process. The func also detects
    whether the account is active or not.
    :param username: Account's username
    :param password: Account's password
    :return dict: {'owner' : <dict containing account details>,
                   'pool': <a list of pools attached>}
    """
    logging.debug('[Account Info] fetching account info')
    for attempt in range(env.RETRY):
        try:
            con = connection.UEPConnection(env.STAGE_CANDLEPIN,
                                           username=username,
                                           password=password)

            owner_dict = con.getOwnerList(con.username)[0]
            pool_list = con.getPoolsList(owner=owner_dict['key'])

        except connection.RestlibException as e:
            # the only way how to differentiate the error reason is to match
            # the content of the error message
            if "You must first accept" in e.msg:
                logging.warning("[Account Info] Terms have not been accepted"
                                " yet, can't display any data")
                raise NameError("User is not active, can't retrieve data from "
                                "Candlepin")

            elif "Invalid username or password" in e.msg:
                logging.error("[Account Info] invalid username or password "
                              "provided for account '{0}' ".format(username))
                raise ValueError("Invalid username or password")

            else:
                logging.error("[Account Info] {0}".format(e))
                continue

        except (SSLError, connection.ConnectionException) as e:
            logging.error("[Account Info] Network issues: {0}".format(e))
            continue

        except (KeyError, IndexError, connection.BadCertificateException) as e:
            # When the user does not exist or the 'orgId' is missing
            logging.error("[Account Info] missing for account '{0}': {1}"
                          "".format(username, e))
            raise NameError('User is not present in Candlepin')
        break
    else:
        # if we run out of retries (only due to the 'continue' statement),
        # through an error
        logging.error("[Account Info] out of retries")
        raise ValueError("Unable to verify credentials for account '{0}'"
                         "".format(username))

    # if when everything is fine and 'break' invoked, return result
    return {'pools': pool_list, 'owner': owner_dict}


def pool_worker(queue, username, password, lst):
    """
    Fetch and filter the data for each pool

    For each item available in the 'queue' determine which information is
    needed and try to fetch the quantity if necessary.

    Pool data the tool is interested in are:
    {'id': <subscription pool ID>,
     'sku': <SKU identifier>,
     'name': <SKU name for easier identification>,
     'quantity': <pool quantity corrected by multipliers>}

    Only pools marked as 'NORMAL' matters.
    :param queue: A Queue instance containing pools from Candlepin
    :param username: Account's usermane
    :param password: Account's password
    :param lst: a dict where the result is appended
    """
    while True:
        # In case of empty queue, break and exit
        if queue.empty():
            break
        pool = queue.get()
        logging.debug("[Account Info] pool worker - parsing '{0}' pool's data"
                      "".format(pool['id']))

        # Skip if not 'NORMAL'
        if pool['type'].lower() != 'normal':
            queue.task_done()
            continue

        # General info
        pool_data = {
            'id': pool['id'],
            'sku': pool['productId'],
            'name': pool['productName']
        }

        # Compute quantity
        if pool['quantity'] is -1:
            pool_data['quantity'] = 'unlimited'
        else:
            multipliers = [1,1]
            try:
                multipliers = utils.get_multiplier(username, password,
                                                   pool['productId'])
            except NameError:
                # failed to get multipliers
                # NOTE: just task_done? Wouldn't be an exception better?
                queue.task_done()

            pool_data['quantity'] = \
                    pool['quantity'] / multipliers[0] / multipliers[1]

        lst.append(pool_data)
        queue.task_done()


def get_details(username, password):
    """
    Query the Candlepin for information about given account.

    Retrieve account's details, parse them and form a dictionary containing the
    important data (general info and subscription pools as well).
    :param username: Account's username
    :param password: Account's password
    :return dict: Structured data with account details and attached
                  subscriptions
    """
    # Get data
    raw_data = __raw_get_data(username, password)
    # Process retrieved data
    logging.debug('[Account Info] parsing account info')
    # General account information
    data = {'username': username, 'org_id': raw_data['owner']['key']}

    # If pools are present, process each of them
    if not raw_data['pools']:
        logging.debug("[Account Info] no pools present for '{0}' account".format(username))
        data['pools'] = list()
        return data

    pools = list()

    # Initialize the pools queue
    queue = Queue()
    [queue.put(item) for item in raw_data['pools']]

    # Initialize workers
    threads = list()
    if len(raw_data['pools']) > env.MAX_THREADS:
        max_threads = env.MAX_THREADS
    else:
        max_threads = len(raw_data['pools'])

    for i in range(max_threads):
        t = Thread(target=pool_worker, args=(queue, username, password, pools))
        t.setDaemon(True)
        t.start()
        threads.append(t)

    # Block until the data are retrieved, then stop the workers
    queue.join()

    data['pools'] = sorted(pools, key=lambda item: item['id'])
    logging.debug("[Account Info] found and parsed {0} pools ({2} skipped) for '{1}' account"
                  "".format(len(data['pools']), username,
                            len(raw_data['pools']) - len(data['pools'])))
    return data
