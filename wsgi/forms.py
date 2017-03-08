from flask_wtf import FlaskForm
from wtforms import (StringField, SubmitField, IntegerField, BooleanField,
                     FileField, SelectField, DateTimeField)
from wtforms.validators import DataRequired

from choices import CHOICES

__author__ = "tcoufal"


USERNAME = StringField(
    label="Username",
    render_kw={
        "placeholder": "login",
        "maxlength": 255,
        "minlenght": 5,
        "pattern": '^[^\s"$\\^<>|+%\\/;:,\\\\*=~]{5,255}$',
        "title": 'Login must be at least 5 characters long (up to 255) '
                 'and cannot contain spaces or the following special '
                 'characters: (") ($) (^) (<) (>) (|) (+) (%) (/) (;) '
                 '(:) (,) (\) (*) (=) (~)'
    },
    validators=[DataRequired()]
)

PASSWORD = StringField(
    label="Password",
    render_kw={
        "placeholder": "password",
        "maxlength": 25
    },
    validators=[DataRequired()]
)


class CreateAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    first_name = StringField(
        label="First Name",
        render_kw={"placeholder": "(optional)"},
    )
    last_name = StringField(
        label="Last Name",
        render_kw={"placeholder": "(optional)"},
    )
    sku = StringField(
        label="Subscription SKUs",
        render_kw={
            "placeholder": "SKU1, SKU2,.. (optional - can be done via "
                           "Add Subscription tab)"}
    )
    quantity = IntegerField(
        label="Quantity",
        render_kw={
            "placeholder": ("effective to all SKUs listed above "
                            "(default is 1)"),
            "type": "number",
            "min": 1
        }
    )
    expire = DateTimeField(
        label="Expiration Date",
        render_kw={
            "placeholder": ("date when subscription expires (default = 1 year "
                            "from today)"),
            "pattern": "[0-9]{2}/[0-9]{2}/[0-9]{4}",
            "data-field-type": "date"
        }
    )
    terms = BooleanField(
        label="Accept Terms and Conditions",
        default=True,
        render_kw={"value": "true"}
    )
    submit = SubmitField("Create")


class EntitleAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    sku = StringField(
        label="Subscription SKUs",
        render_kw={"placeholder": "SKU1, SKU2,.."},
        validators=[DataRequired()]
    )
    quantity = IntegerField(
        label="Quantity",
        render_kw={
            "placeholder": ("effective to all SKUs listed above "
                            "(default = 1)"),
            "type": "number",
            "min": 1
        }
    )
    expire = DateTimeField(
        label="Expiration Date",
        render_kw={
            "placeholder": ("date when subscription expires (default = 1 year "
                            "from today)"),
            "pattern": "[0-9]{2}/[0-9]{2}/[0-9]{4}",
            "data-field-type": "date"
        }
    )
    terms = BooleanField(
        label="Accept Terms and Conditions",
        default=True,
        render_kw={"value": "true"}
    )
    submit = SubmitField("Entitle")


class CreateFormCSV(FlaskForm):
    filename = FileField(
        validators=[DataRequired()]
    )
    accept = BooleanField(
        label="Accept Terms and Conditions",
        default=True,
        render_kw={"value": "true"}
    )
    submit = SubmitField("Import")


class SearchBasic(FlaskForm):
    category = SelectField(choices=[
        ('ph_product_name', "Product Hierarchy: Product Name"),
        ('id', 'SKU')
    ])
    id = StringField(render_kw={"placeholder": "SKU identifier"})
    ph_product_name = SelectField(choices=CHOICES['ph_product_name'])
    submit = SubmitField("Search")


class SearchAdvanced(FlaskForm):
    attribute = SelectField(label="*SKU Attribute 1:",
                            choices=CHOICES['columns'])
    compare = SelectField(label="", choices=CHOICES['compare'])
    data = StringField(label="", validators=[DataRequired()])

    submit = SubmitField("Search")

    def show_input(self, field_name):
        return field_name not in CHOICES['compare_no_value']


class RefreshAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    submit = SubmitField("Refresh")


class ViewAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    submit = SubmitField("View")


class ActivateAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    submit = SubmitField("Accept")


class ExportAccount(FlaskForm):
    username = USERNAME
    password = PASSWORD
    submit = SubmitField("Export")
