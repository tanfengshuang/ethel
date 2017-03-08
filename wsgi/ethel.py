import os
import logging
from datetime import datetime, timedelta
from inspect import getargspec
from json import dumps

from flask import Flask, render_template, request
from flask_bootstrap import Bootstrap

import forms as f
from database import LAYOUT, SkuEntry
from choices import CHOICES
import candlepin
import utils
import environment as env

__author__ = "tcoufal"

# Init Flask server and select base templates set
app = Flask(__name__)
bootstrap = Bootstrap(app)


@app.errorhandler(404)
def page_not_found(e):
    logging.warning("[Page not found] Client requested nonexistent site: {0}"
                    "".format(e))
    return render_template('404.html', report_url=env.REPORT_URL), 404


@app.errorhandler(500)
def internal_server_error(e):
    logging.error("[Internal] An error occured while processing request: {0}"
                  "".format(e))
    return render_template('500.html', report_url=env.REPORT_URL), 500


@app.route('/', methods=['GET', 'POST'])
@app.route('/index', methods=['GET', 'POST'])
@app.route('/index.html', methods=['GET', 'POST'])
def index():
    """
    The front page of the Account Tool

    Instantiates all forms on site and renders the single-page template for
    whole app.
    """
    forms = {
        'create_form': f.CreateAccount(csrf_enabled=False),
        'entitle_form': f.EntitleAccount(csrf_enabled=False),
        'csv_form': f.CreateFormCSV(csrf_enabled=False),
        'search_product_form': f.SearchBasic(csrf_enabled=False),
        'search_attribute_form': f.SearchAdvanced(csrf_enabled=False),
        'refresh_form': f.RefreshAccount(csrf_enabled=False),
        'view_form': f.ViewAccount(csrf_enabled=False),
        'export_form': f.ExportAccount(csrf_enabled=False),
        'terms_form': f.ActivateAccount(csrf_enabled=False),
    }
    return render_template('index.html',
                           report_url=env.REPORT_URL,
                           report_url_candlepin=env.REPORT_URL_CANDLEPIN,
                           documentation_url=env.DOCUMENTATION_URL,
                           layout=LAYOUT,
                           refresh_date=env.CANDLEPIN_REFRESH_DATE,
                           **forms)


@app.route('/account/new', methods=['POST'])
@utils.exception_handler
def account_new():
    """
    Account Manager handler for AJAX - New Account

    :input data: {
        'username': <account's username>,
        'password': <account's password>,
        'first_name': <optional>,
        'last_name': <optional>
    }
    :return dict: {'status': <status_code>, 'msg': <response data>}
    :return int: Status code
    """
    data = request.get_json()
    template = {
        'required': ('username', 'password'),
        'optional': ('first_name', 'last_name')
    }
    create_data = utils.validate_input(template, data)

    # Create user
    candlepin.account.create_new(**create_data)
    # NOTE: Account is inactive by default

    response = {'status': '200',
                'msg': "Account '{0}' created".format(data['username'])}

    return dumps(response), 200


@app.route('/account/activate', methods=['POST'])
@utils.exception_handler
def account_activate():
    """
    Account Manager handler for AJAX - Activate Account

    Accept all Terms and Conditions applicable to the account

    :input data: {'username': <username>, 'password': <password>}
    :return dict: {
        'status': <status_code>,
        'msg': <response msg>
    }
    :return int: Status code
    """
    logging.debug("Account activation requested")
    raw_data = request.get_json()
    template = {'required': ('username', 'password')}
    data = utils.validate_input(template, raw_data)

    # Verify the given credentials
    candlepin.account.verify(data['username'], data['password'])

    # Accept all necessary Terms and Conditions
    org_id = candlepin.utils.get_orgid(data['username'])
    r = candlepin.account.accept_terms(data['username'], data['password'],
                                       org_id=org_id)
    if r['failed']:
        raise RuntimeError("Failed to accept some Ts&Cs for account '{0}': {1}"
                           "".format(data['username'], r['failed']))

    msg = ("Terms and Conditions for account '{0}' were successfully accepted"
           "".format(data['username']))
    return dumps({'status': '200', 'msg': msg}), 200


@app.route('/account/get', methods=['GET'])
@utils.exception_handler
def account_get():
    """
    Account Manager handler for AJAX - View Account

    :input data: {'username': <username>, 'password': <password>}
    :return dict: {
        'status': <status_code>,
        'msg': <response msg in case of error>,
        'data': <response body if success>
    }
    :return int: Status code
    """
    logging.debug("Account details requested")
    raw_data = request.args
    template = {'required': ('username', 'password')}
    data = utils.validate_input(template, raw_data)

    # NOTE: Verification of the account is done during the data retrieval
    # bellow. No need to pool the API twice.
    # Get account details
    info = candlepin.account.get_details(data['username'], data['password'])
    response = {'status': '200', 'data': info}
    return dumps(response), 200


@app.route('/account/attach', methods=['POST'])
@utils.exception_handler
def account_attach():
    """
    Account Manager handler for AJAX - Attach Subscription to an Account

    :input data: {
        'username': <account's username>,
        'password': <account's password>,
        'sku': <list of SKUs to attach>,
        'quantity': <quantity effective to all SKUs listed above>
        'expire': <date of SKU Subscription expiration>
    }
    In case the 'quantity' is not specified or it's malformed, the value is set
    to 1.
    :return dict: {'status': <status_code>, 'msg': <response data>}
    :return int: Status code
    """
    logging.debug("Attaching subscription")
    raw_data = request.get_json()
    template = {
        'required': ('username', 'password', 'sku', 'quantity'),
        'optional': ('expire',)
    }
    try:
        if 'expire' in raw_data.keys():
            raw_data['expire'] = datetime.strptime(raw_data['expire'],
                                                   "%m/%d/%Y")
    except ValueError:
        raise AssertionError('expire', *utils.VALIDATORS['expire'][1:])
    data = utils.validate_input(template, raw_data)

    # Verify the account is available and active
    candlepin.account.verify(data['username'], data['password'])

    # Initiate the attachment process
    org_id = candlepin.utils.get_orgid(data['username'])

    # Subscription is 1 year long, compute the creation date to meet expiration
    if 'expire' in data.keys():
        start = data['expire'].date() - timedelta(days=364)
    else:
        start = datetime.today().date()

    failed = list()
    for sku in data['sku']:
        if not utils.check_sku(sku):
            failed.append(sku)
            continue
        num = candlepin.subscription.create_pool(data['username'], sku,
                                                 data['quantity'], start)
        candlepin.account.activate_pool(data['username'], org_id, num, start)

    if failed:
        raise AssertionError('sku ({0})'.format(failed))

    response = {'status': '200',
                'msg': "These SKUs have been attached to '{0}' account: {1}"
                       "".format(data['username'], data['sku'])}
    return dumps(response), 200


@app.route('/account/refresh', methods=['POST'])
@utils.exception_handler
def subscriptions_refresh():
    """
    Account Manager handler for AJAX - Refresh Subscriptions for Account

    :input data: {
        'username': <account's username>,
        'password': <account's password>
    }
    :return dict: {'status': <status_code>, 'msg': <response data>}
    :return int: Status code
    """
    logging.debug("Refresh requested")
    raw_data = request.get_json()
    template = {'required': ('username', 'password')}
    data = utils.validate_input(template, raw_data)

    # Verify the account is available and active
    candlepin.account.verify(data['username'], data['password'])

    # Initiate the refresh
    candlepin.subscription.refresh_pools(data['username'])
    response = {'status': '200',
                'msg': "Pools for '{0}' refreshed successfully".format(
                    data['username'])}
    return dumps(response), 200


@app.route('/search', methods=['POST'])
@utils.db_required
@utils.exception_handler
def search():
    """
    Search handler for AJAX.

    Triggers a query to DB based on a POST JSON data. The result is dumped as a
    JSON in response.
    :input data: [{'key': <column_criterian>,
                   'operator': <compare_function_key>,
                               # specfied in the CHOICES['compare']
                   'value': <value_to_compare_against>},.. ]
    :return dict: {'status': <status_code>, 'data': <response data>}
    :return int: Status code
    """
    logging.debug("Search requested")
    # get post data and init an empty query
    try:
        data = request.get_json()
    except:
        raise RuntimeError('Query cannot be parsed')

    query = SkuEntry.select()

    logging.debug("Search initiated with query: {0}".format(data))

    # chain the where clause
    for item in data:
        try:
            # get proper column of db layout
            field = SkuEntry._meta.fields[item['key']]

            # determine if operator is applicable
            op = CHOICES['compare'][field.db_field][item['operator']]

            # if we're expecting two arguments, let's look for a value.
            args = [field]
            if len(getargspec(op)[0]) == 2:
                args.append(item['value'])

                # check if the value respects the db field
                ftype = CHOICES['field_type'][field.db_field]
                assert isinstance(item['value'], ftype)

        except (KeyError, AssertionError):
            logging.warning("[Search] Invalid query: {0}".format(item))
            raise RuntimeError("'{0}' is not a valid query".format(item))

        query = query.where(op(*args))

    # sort data
    query.order_by(SkuEntry.id)

    # send json with data as response
    response = [item.dict() for item in query]

    logging.debug("Search done")
    return dumps({'status': '200', 'data': response}), 200

if __name__ == '__main__':
    print "This file is not supposed to be run as is."
    print "If you want to run Ethel locally for debugging, please run:"
    print "python run_locally.py"
