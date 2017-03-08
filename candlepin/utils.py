import logging
import os
import json
import requests
from itertools import ifilter

import candlepin as env

__author__ = "tcoufal"


def load_json(filename):
    """
    Helper for loading a JSON file
    :param filename: relative path of required file to the project root
    :return data: loaded JSON data
    """
    dirname = os.path.dirname(os.path.abspath(__file__))
    with open('{0}/{1}'.format(dirname, filename), 'r') as j:
        data = json.load(j)
    return data


def get_orgid(username):
    """
    Query Account's REST API and select the OrgID
    :param username: A Candlepin account username
    :return org_id: Account's org_id
    """
    logging.debug("[Org Id] query for OrgId initiated")
    try:
        r = requests.get("{0}/login={1}".format(env.REST_USER, username))
        r.raise_for_status()
        data = json.loads(r.content)[0]
        org_id = data['orgId']

    except (KeyError, IndexError, ValueError):
        # When the user does not exist or the 'orgId' is missing
        logging.error("[Org Id] missing for account '{0}': {1}"
                      "".format(username, r.content))
        raise NameError('[Org Id] unable to fetch OrgID from Candlepin')

    except (requests.HTTPError, requests.ConnectionError) as e:
        logging.error("[Org Id] failed to query Account's API: {0}".format(e))
        raise

    logging.debug("[Org Id] query for OrgId done")
    return str(org_id)


def get_multiplier(username, password, sku):
    """
    Query the Stage Candlepin for multipliers for the SKU
    :param username: Account's username
    :param password: Account's password
    :param sku: Subscription SKU
    :return multiplier: SKU's miltiplier
    :return instance_multiplier: SKU's instance multiplier
    """
    logging.debug('[Multiplier] fetching a multiplier for sku: {0}'.format(sku))

    url = "https://{0}/subscription/products/{1}".format(env.STAGE_CANDLEPIN,
                                                        sku)
    for attempt in range(env.RETRY):
        try:
            r = requests.get(url, verify=False, auth=(username, password))
            r.raise_for_status()
            data = json.loads(r.content)

            multiplier = int(data.get("multiplier", 1))

            # iterate over 'attributes', find the 'instance_multiplier' and get
            # it's value the most optimized way Python offers
            tmp_list = ifilter(lambda x: x['name'] == 'instance_multiplier',
                               data['attributes'])
            tmp_dict = {x['name']: x['value'] for x in tmp_list}
            instance_multiplier = int(tmp_dict.get('instance_multiplier', 1))

        except (KeyError, IndexError, ValueError) as e:
            # When the user does not exist or the 'orgId' is missing
            logging.error("[Multiplier] missing for account '{0}', "
                          "sku '{1}' ({2}): {3}"
                          .format(username, sku, r.content, e))
            continue

        except (requests.HTTPError, requests.ConnectionError) as e:
            logging.error("[Multiplier] request failed for account '{0}', "
                          "sku '{1}' ({2}): {3}"
                          "".format(username, sku, r.content, e))
            continue
        break
    else:
        # if we run out of retries (only due to the 'continue' statement),
        # through an error
        raise NameError("[Multiplier] unable to fetch multiplier for '{0}' from Candlepin"
                        "".format(sku))

    return multiplier, instance_multiplier
