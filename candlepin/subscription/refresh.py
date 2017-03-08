import logging
import requests
import candlepin as env
import candlepin.utils as utils

__author__ = "tcoufal"


def refresh_pools(username):
    """
    Request a refresh for given account

    Calls the Candlepin API requesting all subscribed pool for given account to
    refresh.
    :param username: Candlepin account username
    :return bool: True if success, exception is raised otherwise
    """
    logging.debug("Refresh initiated")

    params = {'auto_create_owner': True}

    for attempt in range(env.RETRY):
        try:
            org_id = utils.get_orgid(username)
            url = "{0}/owners/{1}/subscriptions".format(env.REST_CANDLEPIN,
                                                        org_id)
            r = requests.put(url, params=params, verify=False,
                             auth=(env.CANDLEPIN_USER, env.CANDLEPIN_PASSWORD))
            r.raise_for_status()

        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("[Refresh] Failed to query Candlepin: {0}".format(e))
            continue
        break
    else:
        logging.error("[Refresh] out of retries")
        raise RuntimeError("Failed to refresh account '{0}'".format(username))

    logging.debug("Refresh done")
    return True
