# Account tool

This tool aims to facilitate the Account creation, modification and subscription's attachment for Stage Candlepin. In addition it allows the user to query Stage Candlepin's database and look up any of enlisted SKUs.

For internal use only.

## Installation

### Step-by-step

1. Ethel reqiures Python 2.7

2. We suggest you to use virtualenv (or a similar tool)

  ```
  virtualenv env
  source env/bin/activate
  ```

3. Install all required Python libraries for this tool

  ```
  pip install -r requirements.txt
  ```

## Setup

1. If you want to use different remote database, please adjust app parameters: hostname, port, etc. in `wsgi/environment.py`. You can do the same for the `candlepin` package in its `candlepin/__init__.py` file as well.

2. Using local database is recommended for debugging purposes. To do so, save your Ethel database as `sqlite3.db` in the project root. It will be detected automatically.

3. If you want to run the app in debug environment, locally please start the server via `run_locally.py` script

  ```
  python run_locally.py
  ```

4. Otherwise, if you want to deploy Ethel in OpenShift, the appliace should be ready to push to cloud.

Your server should be ready now!


## Usage

Please refer to [Ethel](http://account-manager-stage.app.eng.rdu2.redhat.com) (Help button is located on the top rigth corner).


## Logging

For logging purposes there is a `./log` folder. Log file is spawned there daily without any scheduled rotation.


## Report an issue

In case you meet any inconvenience when using this tool, do not hesitate and report us the issue by creating a ticket [here](
https://engineering.redhat.com/trac/content-tests/newticket?component=Stage+Account+Management+Tool&milestone=Account+Tool&type=account+tool+defect&cc=entitlement-qe@redhat.com).
