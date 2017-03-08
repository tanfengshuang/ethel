from database import SkuEntry, DB
from collections import OrderedDict

__author__ = "tcoufal"


def fetch_choices():
    """
    Fetch data for CHOICES

    This script is run in the init phase of server.
    All DB data needed to fill and render templates properly are fetched here
    and displayed.
    """
    # define choices source
    choices = dict()
    choices['ph_product_name'] = list()
    choices['columns'] = list()
    choices['compare'] = list()

    # populate 'ph_product_name' choices
    DB.connect()
    ph_pn_query = SkuEntry.select(SkuEntry.ph_product_name).distinct()
    DB.close()
    choices['ph_product_name'] = [
        (r.ph_product_name, r.ph_product_name) for r in ph_pn_query]
    choices['ph_product_name'] = sorted(choices['ph_product_name'])
    choices['ph_product_name'].insert(0, ("all", "ALL Products"))

    # populate 'columns' choices list
    excluded = ()
    choices['columns'] = list()

    # take each column and if its not in excluded tuple, add it to list
    for c in SkuEntry._meta.sorted_field_names:
        if c not in excluded:
            item = {'id': c,
                    'name': SkuEntry._meta.fields[c].verbose_name,
                    'type': SkuEntry._meta.fields[c].db_field}
            choices['columns'].append(item)

    # define all available operations over the data in database
    operators = {
        "equals": lambda a, b: a == b,
        "does not equal": lambda a, b: a != b,
        "contains": lambda a, b: a.contains(b),
        "does not contain": lambda a, b: ~(a.contains(b)),
        "greater than": lambda a, b: (a > b) & (a >= 0),
        "less then": lambda a, b: (a < b) & (a >= 0),
        "empty or not applicable": lambda a: (a == -1) | (a.is_null()),
        "applicable": lambda a: ~((a == -1) | (a.is_null())),
        "unlimited": lambda a: a == -2
    }

    # specify valid (and desired and in order) operators for given datatype
    applicable = dict()
    applicable["string"] = ("equals", "contains", "does not contain",
                            "empty or not applicable", "applicable")
    applicable["int"] = ("equals", "does not equal", "greater than",
                         "less then", "empty or not applicable", "applicable",
                         "unlimited")
    applicable["bool"] = ("equals", )

    # populate choices for compare
    choices['compare'] = dict()
    for dtype, ops in applicable.items():
        choices['compare'][dtype] = OrderedDict(
            [(o, operators[o]) for o in ops])

    # set a special tuple of compare operators where search value is not
    # applicable and where we don't want to show the value input field in the
    # template
    choices['compare_no_value'] = (
        "empty or not applicable", "applicable", "unlimited")

    # simple lookup table for data type mapping
    choices['field_type'] = {
        'int': int,
        'string': unicode,
        'bool': bool
    }

    return choices

# set up CHOICES global variable (needed for teplates, forms, dataprocessing)
CHOICES = fetch_choices()
