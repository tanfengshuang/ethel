import os
from json import dumps
from collections import OrderedDict
try:
    from peewee import Model, CharField, Field, MySQLDatabase, SqliteDatabase
    from playhouse.shortcuts import RetryOperationalError
except ImportError:
    print('This script needs to have peewee installed: '
          '\"pip install peewee\"\n'
          'Maybe you are also missing a library for MySQL and MariaDB: '
          '\"pip install PyMySQL\" or \"pip install MySQLdb\"\n')

import environment as env

__author__ = "tcoufal"


class ReconnectableMySQLDatabase(RetryOperationalError, MySQLDatabase):
    """
    In case of broken pipe or any connection outage, reconnect to DB
    """
    pass

# Initialize database

# NOTE: Enable local database in debug mode
if 'ETHEL_LOCAL_DB' not in os.environ:
    DB = ReconnectableMySQLDatabase(
        env.DB_NAME,
        host=env.DB_HOST,
        port=env.DB_PORT,
        user=env.DB_USER,
        password=env.DB_PASSWORD
    )
else:
    DB = SqliteDatabase('sqlite3.db')


class _IntegerField(Field):
    """
    Our special integer field class for the database
    """
    db_field = 'int'

    def db_value(self, value):
        """
        Tell peewee how should values be stored in database.
        Mapping: Null <- None
                   -1 <- ('n/a', 'na', '')
                   -2 <- 'unlimited'
        """
        if value is None:
            return
        elif str(value).lower() in ('n/a', 'na', ''):
            return -1
        elif str(value).lower() == 'unlimited':
            return -2
        else:
            return int(value)

    def python_value(self, value):
        """
        Determine what should be shown when querying data from database.
        In other words what user should see.
        Mapping: (0, -1) -> ('n/a', 'na', '')
                 -2      -> 'unlimited'
        """
        if value is None:
            return
        elif value == -1:
            return 'n/a'
        elif value == -2:
            return 'unlimited'
        else:
            return str(value)


class _BooleanField(Field):
    """
    Our special boolean field class for the database
    """
    db_field = 'bool'

    def db_value(self, value):
        """
        Tell peewee how should values be stored in database.
        Mapping: True <- ('y', 'yes', 'true', '1'
                 False <- ('n', 'no', 'false', '0')
        """
        if str(value).lower() in ('y', 'yes', 'true', '1'):
            return True
        elif str(value).lower() in ('n', 'no', 'false', '0'):
            return False
        else:
            return

    def python_value(self, value):
        """
        Determine what should be shown when querying data from database.
        In other words what user should see.
        """
        return bool(value)


class _CharField(CharField):
    """
    Our very own string field class for the database
    """

    def db_value(self, value):
        """
        Tell peewee how should values be stored in database.
        Mapping: if string == None or empty store as None (Null)
        """
        # for 'empty or n/a' comparison, let's treat -1 as n/a
        if type(value) is int and value == -1:
            return 'n/a'
        # Similarly we want to remap 'none' to None/NULL
        elif str(value).lower() == 'none':
            return
        return value

    def python_value(self, value):
        """
        Determine what should be shown when querying data from database.
        If the string is None, do not show "None" str, draw empty string
        instead.
        """
        if not value:
            value = ''
        return value


class SkuEntry(Model):
    """
    Class for an entry in SKU database
    """
    arch = _CharField(null=True, verbose_name='Arch')
    cloud_access_enabled = _BooleanField(
        null=True, default=0, verbose_name='Cloud Access Enabled')
    cores = _IntegerField(null=True, verbose_name='Cores')
    derived_sku = _CharField(null=True, verbose_name='Derived SKU')
    enabled_consumer_types = _CharField(
        null=True, verbose_name='Enabled Consumer Types')
    eng_product_ids = _CharField(null=True, verbose_name='Eng Product ID(s)')
    host_limited = _BooleanField(
        null=True, default=0, verbose_name='Host Limited')
    instance_multiplier = _IntegerField(
        null=True, verbose_name='Instance Based Virt Multiplier')
    jon_management = _BooleanField(
        null=True, default=0, verbose_name='JON Management')
    management_enabled = _BooleanField(
        null=True, default=0, verbose_name='Management Enabled')
    multi_entitlement = _BooleanField(
        null=True, db_column='multi-entitlement',
        verbose_name='Multi Entitlement')
    multiplier = _IntegerField(null=True, verbose_name='Multiplier')
    name = _CharField(null=True, verbose_name='Product Name')
    ph_category = _CharField(
        null=True, verbose_name='Product Hierarchy: Product Category')
    ph_product_line = _CharField(
        null=True, verbose_name='Product Hierarchy: Product Line')
    ph_product_name = _CharField(
        null=True, verbose_name='Product Hierarchy: Product Name')
    product_family = _CharField(null=True, verbose_name='Product Family')
    ram = _IntegerField(null=True, verbose_name='RAM')
    requires_consumer_type = _CharField(
        null=True, verbose_name='Required Consumer Type')
    id = _CharField(primary_key=True, verbose_name='SKU Name')
    sockets = _IntegerField(null=True, verbose_name='Socket(s)')
    stacking_id = _CharField(null=True, verbose_name='Stacking ID')
    support_level = _CharField(null=True, verbose_name='Support Level')
    support_type = _CharField(null=True, verbose_name='Support Type')
    unlimited_product = _BooleanField(
        null=True, default=0, verbose_name='Unlimited Product')
    username = _CharField(null=True, verbose_name='Username')
    variant = _CharField(null=True, verbose_name='Variant')
    vcpu = _IntegerField(null=True, verbose_name='VCPU')
    virt_limit = _IntegerField(null=True, verbose_name='Virt Limit')
    virt_only = _BooleanField(null=True, default=0, verbose_name='Virt-only')

    def dict(self):
        """
        Dump model (entry) to dict for easier manipulation
        """
        r = dict()
        for k in self._meta.fields.keys():
            try:
                r[k] = str(getattr(self, k))
            except:
                r[k] = dumps(getattr(self, k))
        return r

    class Meta:
        """
        Connect to the database
        """
        database = DB
        db_table = env.DB_TABLE

# Define a list containing attribute names in order as they should appear in
# tables across the app
order = ['id', 'ph_category', 'ph_product_line', 'ph_product_name',
         'name', 'virt_limit', 'sockets', 'vcpu', 'multiplier',
         'unlimited_product', 'requires_consumer_type', 'product_family',
         'management_enabled', 'variant', 'support_level', 'support_type',
         'enabled_consumer_types', 'virt_only', 'cores', 'jon_management',
         'ram', 'instance_multiplier', 'cloud_access_enabled',  'stacking_id',
         'multi_entitlement', 'host_limited', 'derived_sku', 'arch',
         'eng_product_ids',  'username']

LAYOUT = OrderedDict()
[LAYOUT.update({field: SkuEntry._meta.fields[field].verbose_name})
 for field in order]
