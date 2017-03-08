import logging
import requests
import json

import candlepin as env
import candlepin.utils as utils

__author__ = "tcoufal"


def __check_existence(username):
    """
    Check if the account is present in Stage Candlepin

    Query the Stage Candlepin API and try to login with just the accounts
    username.
    :param username: Username applicable to the desired account
    :return bool: True if user exists
    """
    for attempt in range(env.RETRY):
        logging.debug("Checking if user is present in Candlepin")
        try:
            r = requests.get("{0}/login={1}".format(env.REST_USER, username))
            r.raise_for_status()
        except (requests.HTTPError, requests.ConnectionError) as e:
            logging.error('[New Account] failed to access the API: {0}, '
                          'retrying...'.format(e))
            continue
        if username in r.content:
            logging.info("[New Account] the '{0}' already exists"
                         "".format(username))
            return True
        break
    return False


def __raw_create(user_data):
    """
    Raw create user by feeding the Candlepin API with data

    A simple wrapper around the request for a new account on Stage Candlepin
    which just sends the given data and does a retry if needed.
    :param user_data: a dictionary containing account details
    :return bool: True if success
    """
    logging.debug("Creating user")
    for attempt in range(env.RETRY):
        try:
            r = requests.post("{0}/create".format(env.REST_USER),
                              headers={'content-type': 'application/json'},
                              data=json.dumps(user_data))
            r.raise_for_status()

        except (requests.HTTPError, requests.ConnectionError) as e:
            logging.error('[New Account] error when creating account: {0}, '
                          'retrying...'.format(e))
            continue
        return True
    return False


def create_new(username, password, first_name=None,
               last_name=None):
    """
    Create new account for Stage Candlepin

    Loads the env.USER_JSON_PATH JSON with user specification. Then verifies if
    the user is not already present in the Stage Candlepin. If not, the account
    is created and verified.
    :param username: Account's username
    :param password: Account's password
    :param first_name: Account's first name
    :param last_name: Account's last name
    :return org_id: User's Org ID is returned if the creation was successful
    """
    logging.debug("Initiated Account creation")

    # Check if user does not already exist
    if __check_existence(username):
        raise NameError('User already exists')

    # Set the data
    user = utils.load_json(env.USER_JSON_PATH)
    user["login"] = username
    user["loginUppercase"] = username.upper()
    user["password"] = password
    if first_name:
        user["personalInfo"]["firstName"] = first_name
    if last_name:
        user["personalInfo"]["lastName"] = last_name

    # Create user
    if not __raw_create(user):
        raise RuntimeError('Unable to create account')

    # Verify
    logging.debug("Verifying user")
    try:
        org_id = utils.get_orgid(username)
    except NameError as e:
        logging.error('[New Account] failed to verify account: {0}'.format(e))
        raise RuntimeError('Unable to verify if account creation was '
                           'successful')

    # Both creation and verification successful
    return org_id
