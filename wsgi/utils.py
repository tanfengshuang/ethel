import logging
import re
from functools import wraps
from json import dumps
from datetime import timedelta, date

import requests

from werkzeug.exceptions import BadRequest
from flask import request

from database import SkuEntry, DB

__author__ = "tcoufal"


VALIDATORS = {
    'password': (
        lambda x: 1 <= len(str(x)) <= 25,
        'Password must be in range of 1-25 characters'
    ),
    'username': (
        lambda x: re.match('^[^\s"$\\^<>|+%\\/;:,\\\\*=~]{5,255}$', x),
        'Login must be at least 5 characters long (up to 255) '
        'and cannot contain spaces or the following special '
        'characters: (") ($) (^) (<) (>) (|) (+) (%) (/) (;) '
        '(:) (,) (\) (*) (=) (~)'
    ),
    'quantity': (
        lambda x: isinstance(x, int) and x > 0,
        'Quantity has to be of integer type and greater than 0'
    ),
    'sku': (
        lambda x: isinstance(x, list) and len(x),
        'List of SKUs must be an Array instance with at least one SKU listed.'
    ),
    'expire': (
        lambda x:
            timedelta() <= x.date() - date.today() <= timedelta(days=365),
        'Expiration date must be in range 0-365 days from today in '
        '\'mm/dd/yyyy\' format.'
    )
}


def log_request(logger):
    """
    Feed the logger with details about the request
    :param logger: the function that should be used to logg the data
    """
    params = request.get_json() if request.method.lower() == 'post' else request.args

    msg = '{0} request to {1}, called with: {2}'.format(
        request.method, request.path, params)
    logger(msg)


def validate_input(template, raw_data):
    """
    :param template: {'required': <list of params required>,
                      'optional': <optional parameters>}
    :param raw_data: dict of data to proceed
    """
    data = {}

    # Check presence of require params
    for item in template['required']:
        try:
            data[item] = raw_data[item]
        except KeyError as e:
            raise SyntaxError(e.message)

    # Check for the optionals
    for item in template.get('optional', []):
        try:
            data[item] = raw_data[item]
        except KeyError:
            pass

    # Process required validators
    for field, validator in VALIDATORS.items():
        func = validator[0]
        if field in data.keys() and not func(data[field]):
            raise AssertionError(field, *validator[1:])

    return data


def db_required(func):
    """
    A decorator for establishing and closing a connection when the request
    requires to use SKU Attributes DB.
    """
    @wraps(func)
    def decorated_request(*args, **kwargs):
        DB.connect()
        logging.info("[Connection] to database: established")
        # Process the request
        response = func(*args, **kwargs)
        DB.close()
        logging.info("[Connection] to database: closed")
        return response
    return decorated_request


def exception_handler(func):
    """
    A decorator for Exception Handling for requests to our API.

    It provides a basic and most common exception handlings.
    List of exceptions and their meaning:

    SyntaxError:        Raised in case when parameter is missing in the request
                        or it's of wrong data type

    AssertionError:     When parameter validation (checking its value) fails

    NameError:          User is present in Candlepin when we're not expecting
                        that. And vice versa

    ValueError:         Raised when used credentials are wrong

    RuntimeError:       The Candlepin module returned any other result then
                        success

    ConnectionError,
    HTTPError:          Candlepin module is facing issues when communicating
                        with Stage Candlepin

    BadRequest:         When Flask is not satisfied by user input (eg. JSON
                        failed to parse)

    Exception:          Any other exception is caught as well, just for safety
    """
    @wraps(func)
    def decorated_view(*args, **kwargs):
        try:
            return func(*args, **kwargs)

        except SyntaxError as e:
            logging.error("Bad request: Issue with parameter (syntax) '{0}':"
                          " {1}".format(e.message, e))
            log_request(logging.error)
            response = {'status': '400',
                        'msg': "Bad request: Parameter '{0}' is either missing"
                        " or of wrong type".format(e.message)}
            return dumps(response), 400

        except AssertionError as e:
            logging.error("Bad request: Issue with parameter (value) '{0}':"
                          " {1}".format(e.args[0], e))
            log_request(logging.error)
            response = {'status': '400',
                        'msg': "Bad request: Value of '{0}' parameter is not "
                        "valid input".format(e.args[0])}
            if len(e.args) > 1:
                response['msg'] += ", reason: {0}".format("".join(e.args[1:]))
            return dumps(response), 400

        except (NameError, ValueError, RuntimeError) as e:
            logging.error(e)
            log_request(logging.error)
            response = {'status': '400', 'msg': e.message}
            return dumps(response), 400

        except (requests.ConnectionError, requests.HTTPError) as e:
            logging.error("Connection error: {0}".format(e))
            log_request(logging.error)
            response = {'status': '400',
                        'msg': "Application encountered an network issue, "
                        "please try again later"}
            return dumps(response), 400

        except BadRequest as e:
            logging.error("Bad request: {0}: {1}".format(e, request))
            log_request(logging.error)
            response = {
                'status': '400',
                'msg': "Bad Request: Unable to evaluate input data"
            }
            return dumps(response), 400

        except Exception as e:
            logging.error(
                "Uncaught exception: {0}, {1}: {2}".format(type(e), e,
                                                           request.data))
            log_request(logging.error)
            response = {
                'status': '500',
                'msg': "Internal error (please report an issue with this "
                       "response attached): {0}".format(e.message)
            }
            return dumps(response), 500

    return decorated_view


def check_sku(sku):
    """
    Query the database for given SKU and return True if such SKU exists
    """
    try:
        SkuEntry.get(SkuEntry.id == sku.upper())
    except SkuEntry.DoesNotExist:
        logging.error("sku {0} doesn't exist in database".format(sku))
        return False
    return True
