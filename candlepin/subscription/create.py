import logging
import requests
import json

import candlepin as env
import candlepin.utils as utils

__author__ = "tcoufal"


def create_pool(username, sku, quantity, start_date):
    """
    SKU Subscription pool creation process

    A requester for a new pool for the given account (specified by a username).
    Runs a query to the Stage Candlepin API hooking given SKU ID with the
    account by creating a specific pool and returns it's ID.
    :param username: Account's username
    :param sku: SKU the caller requests to subscribe
    :param quantity: Pool quantity
    :param start_date: A date by which the pool is available
    :return int: A Pool ID of the created subscription pool
    """
    logging.debug('Initiated pool creation')

    # Build a JSON/dict with the request data
    hock_info = utils.load_json(env.ATTACH_SKU_PATH)
    hock_info['login'] = username
    hock_info['lines'][0]['productSKU'] = sku
    line = hock_info['lines'][0]['lineItem']
    line['sku'] = sku
    line['quantity'] = quantity
    line['entitlementStartDate'] = str(start_date)

    for attempt in range(env.RETRY):
        try:
            r = requests.put('{0}/hock/order'.format(env.REST_REGNUM),
                             headers={'content-type': 'application/json'},
                             data=json.dumps(hock_info))
            regnum = str(json.loads(r.content)[
                         'regNumbers'][0][0]['regNumber'])
            r.raise_for_status()

        except (KeyError, ValueError) as e:
            logging.error("[Create Pool] failed to create pool for {0}: {1}"
                          "".format(sku, e))
            raise RuntimeError("Failed to create a {0} Subscription pool for "
                               " '{1}' account".format(sku, username))

        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("[Create Pool] failed to create pool for {0}: {1}"
                          "".format(sku, e))
            continue
        break
    else:
        logging.error("[Create Pool] out of retries")
        raise RuntimeError("Failed to create a {0} Subscription pool for "
                           " '{1}' account".format(sku, username))

    logging.info("[Create Pool] successfully created SKU's '{0}' pool '{1}'"
                 " for account '{2}'".format(sku, regnum, username))
    return regnum
