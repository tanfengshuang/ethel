import logging

from rhsm import connection
from M2Crypto.SSL import SSLError

import candlepin as env

__author__ = "tcoufal"


def verify(username, password, ignore_inactive=True):
    """
    Verify the credentials for the account

    A simple checker whether the credentials provided match the account in
    Candlepin. Also provides a verification if the account is active (if it has
    all the "Terms and Conditions" accepted). In case of inactive account
    activation is requested.
    :param username: Account's username
    :param password: Account's password
    """
    for attempt in range(env.RETRY):
        try:
            con = connection.UEPConnection(env.STAGE_CANDLEPIN,
                                           username=username,
                                           password=password)
            # Perform a request to server
            con.getOwnerList(con.username)

        except connection.RestlibException as e:
            # the only way how to differentiate the error reason is to match
            # the content of the error message
            if "You must first accept" in e.msg:
                logging.warning("[Verify Account] Terms have not been accepted"
                                " yet.")
                # if ignore_inactive is set, treat the credentials as valid
                if ignore_inactive:
                    break

                raise RuntimeError("Account is not active")

            elif "Invalid username or password" in e.msg:
                logging.error("[Verify Account] invalid username or password "
                              "provided for account '{0}' ".format(username))
                raise ValueError("Invalid username or password")

            else:
                logging.error("[Verify Account] {0}".format(e))
                continue

        except (SSLError, connection.ConnectionException) as e:
            logging.error("[Verify Account] Network issues: {0}".format(e))
            continue

        except (KeyError, IndexError, connection.BadCertificateException) as e:
            # When the user does not exist or the 'orgId' is missing
            logging.error("[Verify Account] missing for account '{0}': {1}"
                          "".format(username, e))
            raise NameError('User is not present in Candlepin')
        break
    else:
        # if we run out of retries (only due to the 'continue' statement),
        # through an error
        logging.error("[Account Info] out of retries")
        raise ValueError("Unable to verify credentials for account '{0}'"
                         "".format(username))
    return True
