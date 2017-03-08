/**
 * @summary     Account Importing
 * @description Push data from the CSV to Ethel
 * @version     1.0
 * @file        import.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, Papa, __noToastAjax, Toast, __serializeForm */

// Global list of accounts to import
var IMPORT_ACCOUNTS = {
  pending: [], // accounts listed to be imported
  success: [], // account references to the ones which succeeded
  error: []    // the failed ones are referenced here
}

/**
 * Account to be imported
 *
 * Class representation of account that should be imported into Candlepin
 * @class
 * @param {string} username - Account's username to use
 * @param {string} password - A password that should be set
 * @param {Object} pools - Data abount pools
 */
function ImportAccount (username, password, pools) {
  // store account details
  this.username = username
  this.password = password
  this.pools = pools

  // store reference to the DOM (visible list item)
  this.dom = undefined

  // create wrap list for account's status when importing
  this.result = $('<ul class="list-unstyled"></ul>')

  // count the pools imported
  this.imported_pools_counter = 0

  /**
   * Destroy item
   *
   * Basically it removes item's DOM and unlinks the reference from 'pending'.
   * That results into a lost reference to the item, so it's not accessible
   * anymore.
   * @function
   */
  this.destroyDom = function () {
    var parent = this

    // unlink the reference
    IMPORT_ACCOUNTS['pending'] = IMPORT_ACCOUNTS['pending'].filter(function (el) {
      return el.username !== parent.username
    })

    // delete DOM
    this.dom.remove()

    // if there are no accounts left to import, show back the drop-zone
    if (!$('#import .list-group').children().length) {
      $('.drop-zone').show()
      $('#import .import-data').addClass('hidden')
      $('#import .list-group').empty()
    }
  }

  /**
   * Create DOM node
   *
   * Build a list item to display. Take the template, adjust it's content and
   * bind actions to buttons. Finally show the node in the list.
   *  All data manipulation in this function has only the aesthetic reasons and
   * doesn't affect the import process.
   * @function
   */
  this.createDom = function () {
    var parent = this

    // node template
    this.dom = $(`
        <div class="list-group-item">
          <div class="list-view-pf-actions">
            <span class="remove pficon pficon-close"></span>
            <div class="pficon progress-spinner"><div class="spinner spinner-sm"></div></div>
          </div>
          <div class="list-view-pf-main-info">
            <div class="list-view-pf-left">
              <span class="pficon pficon-user"></span>
            </div>
            <div class="list-view-pf-body">
              <div class="list-view-pf-description">
                <div class="list-group-item-heading">
                  Account
                </div>
                <div class="list-group-item-text">
                  <div class="password">
                    Password:
                  </div>
                  <div class="pools">
                    Subscriptions:
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`)

    // adjust the content
    $('.list-group-item-heading', this.dom).text(this.username)
    $('.list-group-item-text .password', this.dom).html('Password: <i>' + this.password + '</i><br>')
    $('.list-group-item-text .pools', this.dom).html(function (i, text) {
      var pools = ''
      var tmp_quantity = 0

      // if there are no pools listed, show that the account is empty
      if (!parent.pools.length) {
        return text + '<strong>No valid subscription pools listed.</strong>'
      }

      // loop through pools and add each to the DOM in format:
      // "<SKU ID> (quantity: <quantity>)"
      for (var p = 0; p < parent.pools.length; p++) {
        // if csv contains quantity 10000 it means it should be unlimited
        tmp_quantity = parent.pools[p].quantity === 10000 ? 'unlimited' : parent.pools[p].quantity
        pools = pools + ' <strong>' + parent.pools[p].id + '</strong> <i>(quantity: ' + tmp_quantity + ')</i>'
      }
      return text + pools
    })

    // bind action for X button
    $('.list-view-pf-actions .remove', this.dom).click(function (e) {
      parent.destroyDom()
    })

    // hide spinner by default
    $('.list-view-pf-actions .progress-spinner', this.dom).addClass('hidden')

    // show the DOM in the list of accounts to import
    $('#import .list-group').append(this.dom)
  }

  /**
   * Process the import
   *
   * Take the account and let it import. Manage every needed API call for the
   * import process. When import of the account is done update DOM to match the
   * return status (success/failure). And in case that this process id done for
   * all accounts, display the success and failure toasts as well.
   * @function
   * @param {bool} accept - indicates whether the account should be activated
   * @param {Object} toast - the already visible loading toast
   */
  this.import = function (accept, toast) {
    // hide the X button and show the spinner
    $('.list-view-pf-actions .remove', this.dom).remove()
    $('.list-view-pf-actions .progress-spinner', this.dom).removeClass('hidden')

    // setup a default data sent to the Ethel
    var data = {
      username: this.username,
      password: this.password
    }
    var parent = this

    /**
     * Output when the import is done
     *
     * Update account's DOM and in case the account was the last one to import
     * (eg. all accounts are imported now) show the success and failure toasts
     * @function
     */
    var output = function () {
      // initialize the tooltip containing the import details
      // binded to the list item, data are feeded separately during the import
      $('.list-view-pf-main-info', parent.dom).prop('title', parent.result[0].outerHTML).attr({
        'data-toggle': 'tooltip',
        'data-placement': 'bottom',
        'data-html': true
      })
      $('[data-toggle="tooltip"]', parent.dom).tooltip()

      // if all accounts are imported, finalize whole import
      if (IMPORT_ACCOUNTS['success'].length + IMPORT_ACCOUNTS['error'].length === IMPORT_ACCOUNTS['pending'].length) {
        // remove the loading toast
        toast.destroy(1)

        // show error toast if there are failed accounts
        if (IMPORT_ACCOUNTS['error'].length) {
          var failed = IMPORT_ACCOUNTS['error'].map(function (account) {
            return account.username
          })
          var msg = 'Failed to import account(s): <br />' + failed.toString().split(',').join('<br />')
          var failure = new Toast('error', '', msg)
          failure.show()
        }

        // show toast for successfully imported accounts
        if (IMPORT_ACCOUNTS['success'].length) {
          var succeed = IMPORT_ACCOUNTS['success'].map(function (account) {
            return account.username
          })
          msg = 'Successfully imported account(s): <br />' + succeed.toString().split(',').join('<br />')
          var success = new Toast('success', '', msg)
          success.show(); success.destroy(10000)
        }

        // show again the button for a new import (hidden when the import begins)
        $('.form-new-import button').removeClass('hidden')
      }
    }

    /**
     * Handle the error gracefully
     *
     * Let the user know that something went wrong. When error is raised, the
     * import process for this account stops.
     * @function
     * @param {Object} e - the event object (we're interested in e.msg)
     */
    var err_callback = function (e) {
      // hide spinner, show error icon and update the status tooltip
      $('.list-view-pf-actions .progress-spinner', parent.dom).addClass('hidden')
      $('.list-view-pf-left', parent.dom).html('<span class="pficon pficon-error-circle-o"></span>')
      // append account to the failed list
      IMPORT_ACCOUNTS['error'].push(parent)

      parent.result.append($('<li><span class="pficon pficon-error-circle-o"></span>' + e.msg + '</li>'))
      output()
    }

    /**
     * Handle the success
     *
     * Give user a visual feedback that the import of this specific account went
     * fine.
     * @function
     * @param {Object} e - the response object (required by JQuery, when used
     *    as a callback)
     */
    var done = function (e) {
      // hide spinner, show OK icon and update status
      $('.list-view-pf-actions .progress-spinner', parent.dom).addClass('hidden')
      $('.list-view-pf-left', parent.dom).html('<span class="pficon pficon-ok"></span>')
      // add account to the list of successfully imported accounts
      IMPORT_ACCOUNTS['success'].push(parent)

      // if called with <e> it means activation was successful
      // if the <e> is undefined it means activation has been skipped
      if (e) { parent.result.append($('<li><span class="pficon pficon-ok"></span>Ts&Cs accepted</li>')) }
      parent.result.append($('<li><span class="pficon pficon-ok"></span>Done</li>'))

      output()
    }

    /**
     * Refresh went fine
     *
     * Procceed to account activation if needed, jump to done() otherwise
     * @function
     * @param {Object} e - the response object (required by JQuery)
     */
    var refresh_success = function (e) {
      parent.result.append($('<li><span class="pficon pficon-ok"></span>Refresh successfull</li>'))
      if (accept) {
        __noToastAjax(data, '/account/activate', {
          callbacks: {
            success: done,
            failure: err_callback
          }
        })
      } else {
        done()
      }
    }

    /**
     * Attach went fine
     *
     * Proceed to refresh when attaching subscriptions went fine
     * @function
     * @param {Object} e - the response object (required by JQuery)
     */
    var attach_success = function (e) {
      // attaching of a pool went fine, increment the counter
      parent.imported_pools_counter++

      // if all pools are imported, go to refresh
      if (parent.imported_pools_counter === parent.pools.length) {
        parent.result.append($('<li><span class="pficon pficon-ok"></span>All pools attached</li>'))

        __noToastAjax(data, '/account/refresh', {
          callbacks: {
            success: refresh_success,
            failure: err_callback
          }
        })
      }
    }

    /**
     * Account has been created
     *
     * Proceed to pool attachement
     * @function
     * @param {Object} e - the response object (required by JQuery)
     */
    var new_success = function (e) {
      parent.result.append($('<li><span class="pficon pficon-ok"></span>Empty account created</li>'))
      // if there are no pools, skip the attaching
      if (!parent.pools.length) {
        // decrement the counter so it matches 0 when incremented
        parent.imported_pools_counter--
        attach_success()
      }

      // iterate over pools and initiate pool creation for each
      for (var p = 0; p < parent.pools.length; p++) {
        // clone the template and update it with SKU ID and quantity
        var pooldata = data
        pooldata['sku'] = [parent.pools[p].id]
        pooldata['quantity'] = parseInt(parent.pools[p].quantity, 10)
        __noToastAjax(pooldata, '/account/attach', {
          callbacks: {
            success: attach_success,
            failure: err_callback
          }
        })
      }
    }

    // Initiate the account creation
    __noToastAjax(data, '/account/new', {
      callbacks: {
        success: new_success,
        failure: err_callback
      }
    })
  }

  return this
}

/**
 * Parse import file
 *
 * Go through the CSV file, process each account and populate the 'pending' list
 * Creates ImportAccount instance for each account.
 * @param {string} file - name of the file to parse
 */
function parseImport (file) {
  /**
   * Handle failed import
   *
   * Show toast that the parsing failed and display the drop zone again
   * @function
   * @param {string} msg - reason of failre
   */
  var failed_import = function (msg) {
    var t = new Toast('error', '', msg)
    t.show(); t.destroy()
    $('#import .form-submit').hide()
    $('.drop-zone').show()
    $('#import .import-data').addClass('hidden')
  }

  // check if the file is indeed CSV
  if (file.type !== 'text/csv') {
    failed_import("File '" + file.name + "' is not a CSV file")
    return
  }

  // hide drop zone, show the list of accounts
  $('.form-new-import button').addClass('hidden')
  $('.drop-zone').hide()
  $('#import .import-data').removeClass('hidden')
  $('#import .list-group').empty()

  // clear the global dictionary
  IMPORT_ACCOUNTS = {
    pending: [],
    success: [],
    error: []
  }

  // show the button to initiate the import
  $('#import .form-submit').show()

  // parse the file via Papa
  Papa.parse(file, {
    complete: function (results, file) {
      // handler when the import is done
      var items = results.data

      // parse each line separately
      for (var i = 0; i < items.length; i++) {
        var username = items[i].shift()
        var password = items[i].shift()
        var pools = []

        // validate username + password presence
        if (!username) continue // empty line

        if (!password) {
          var t = new Toast('error', '', "Unable to parse password '" + password + "' (account " + username + ')')
          t.show(); t.destroy()
        }

        // process the pools
        for (var j = 0; j < items[i].length; j += 2) {
          var id = items[i][j]

          // in case of comma at the end of line
          if (!id) { continue }

          // parse quantity
          var quantity = Number(items[i][j + 1], 10)
          if (isNaN(quantity)) {
            var t = new Toast('error', '', "Quantity '" + items[i][j + 1] + "' is not valid input (account " + username + ')')
            t.show(); t.destroy()
            continue
          }
          pools.push({'id': id, 'quantity': quantity})
        }

        // create account entry
        var account = new ImportAccount(username, password, pools)
        account.createDom()
        IMPORT_ACCOUNTS['pending'].push(account)
      }

      // no accounts were parsed
      if (!IMPORT_ACCOUNTS['pending'].length) {
        failed_import('Unable to parse any account')
      }
    },
    error: function () {
      // handler for the failed parsing
      failed_import('Error when parsing imported file')
    }
  })
}

/**
 * Drag and drop handler
 *
 * Create a visual feedback when dragging files over the drop zone
 * Handle the drop event
 */
function dragDropVisual () {
  // Start the drag effect
  $('.drop-zone').on('dragover', function (e) {
    e.preventDefault()
    e.stopPropagation()
    $(this).addClass('dragover')
  })

  // Stop the effect when mouse out/release
  $('.drop-zone').on('dragleave dragend', function (e) {
    e.preventDefault()
    e.stopPropagation()
    $(this).removeClass('dragover')
  })

  // Stop when successfully dropped
  $('.drop-zone').on('drop', function (e) {
    e.stopPropagation()
    e.preventDefault()
    $(this).removeClass('dragover')

    // we're interested in just first file
    var files = e.originalEvent.dataTransfer.files
    for (var i = 0; i < files.length; i++) {
      parseImport(files[i])
    }
  })
}

/**
 * Bind form actions and initialize the drop-zone when the page is loaded
 */
$(document).ready(function () {
  dragDropVisual()

  // bind parsing file to file selection (when value of the file button changes)
  $('#import input[type=file]').on('change', function (e) {
    var files = e.originalEvent.target.files

    // parse all files (just in case browser allows to select multiple)
    for (var i = 0; i < files.length; i++) {
      parseImport(files[i])
    }
  })

  // bind action when import should start
  $('#import_form').submit(function (event) {
    event.preventDefault()

    // show loading toast
    var l = new Toast('loading', '', 'Importing accounts')
    l.show()

    // hide the submit button for now
    $('#import .form-submit').hide()

    // call the import for every account in the list
    for (var i = 0; i < IMPORT_ACCOUNTS['pending'].length; i++) {
      var account = IMPORT_ACCOUNTS['pending'][i]
      account.import(__serializeForm(this).accept, l)
    }
  })

  // hook the new import button and the file selection (it has the same effect)
  $('.form-new-import button').click(function (event) {
    $('.import-data input[type=file]').click()
  })
})
