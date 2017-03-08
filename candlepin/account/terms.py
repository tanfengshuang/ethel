import requests
import logging
import json

import candlepin as env
import candlepin.utils as utils

__author__ = "tcoufal"


def __accept_term(term_id, user_id, customer_id):
    """
    Accepting the given Terms and Conditions as the specified user account

    Build an url for the API and try to set the Terms as accepted. Retry in a
    case of network issues.
    :param term_id: Identifier of the Terms and Conditions
    :param user_id: Account's Candlepin ID
    :param customer_id: An ID specified in Oracle for the account
    :return bool: True if success
    """
    url = "{0}/ack/terms_id={1}/userid={2}/customerid={3}/type=ACCEPT"
    url = url.format(env.REST_TERMS, term_id, user_id, customer_id)

    for attempt in range(env.RETRY):
        try:
            r = requests.put(url)
            r.raise_for_status()
        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("[Accept Terms] failed to accept terms {0}: {1},"
                          " retrying...".format(term_id, e))
            continue
        logging.info("[Accept Terms] accepted {0}".format(term_id))
        return True

    logging.error('[Accept Terms] out of retries')
    return False


def __get_data(org_id):
    """
    Raw Terms and conditions identifiers retrieval

    Based on the given 'org_id' the function queries the API and retrieves
    every type of user ID needed for Terms accepting process and all the Terms
    available as well.
    :param org_id: Account's organization ID
    :return tuple: (<account Candlepin ID>,
                    <account Oracle ID>,
                    <customer ID from Oracle>,
                    <all Terms available in a dictinary>)
    """
    for attempt in range(env.RETRY):
        try:
            # Get Oracle ID and User ID
            r = requests.get("{0}/orgId={1}".format(env.REST_USER, org_id))
            r.raise_for_status()
            data = json.loads(r.content)[0]
            user_id = data["id"]
            oracle_id = data["customer"]["oracleCustomerNumber"]

            # Get Customer ID
            r = requests.get("{0}/customers/search".format(env.REST_USER),
                             params={"oracleCustomerNumber": oracle_id,
                                     "max": 10})
            r.raise_for_status()
            customer_id = json.loads(r.content)[0]["id"]

            # Get all terms to sign
            r = requests.get("{0}/status/userId={1}".format(env.REST_TERMS,
                                                            user_id))
            r.raise_for_status()
            terms = json.loads(r.content)

        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("[Accept Terms] account data query failed: {0}"
                          "".format(e))
            continue
        return (user_id, oracle_id, customer_id, terms)
    return False


def accept_terms(username, password, org_id=None):
    """
    Accept Red Hat's Terms and Conditions and verify the result

    Based on the given org_id (queried based on the username) for the account
    the function initiates a Terms retrieval and then runs a request in order
    to accept each of them. If it fails to accept the affected Terms are
    collected and user is notified.
    :param username: Account's username
    :param password: Account's password
    :param org_id: Optionally caller can specify the Organization ID
    :return dict: {'succeed': <list of accepted Ts&Cs>,
                   'failed': <list of failed ones>}
    """
    if not org_id:
        org_id = utils.get_orgid(username)

    # Retrieve data
    data = __get_data(org_id)
    if not data:
        logging.error('Unable to retrieve details about account {0}\'s terms '
                      'to sign.'.format(username))
        raise RuntimeError('Unable to retrieve details about account\'s Ts&Cs '
                           'to sign')

    user_id, oracle_id, customer_id, terms = data

    logging.info("[Accept Terms] for user '{0}' id: '{1}', "
                 "oracleCustomerNumber: '{2}', customer_id: {3}"
                 "".format(username, user_id, oracle_id, customer_id))

    # Walk the terms and accept them
    result = {'succeed': [], 'failed': []}
    for term in terms["unacknowledged"]:
        if __accept_term(term['id'], user_id, customer_id):
            result['succeed'].append(term['id'])
        else:
            result['failed'].append(term['id'])

    if result['failed']:
        logging.debug("Some Terms failed to accept: {0}".format(result))
    return result
