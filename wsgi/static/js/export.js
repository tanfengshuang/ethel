/**
 * @summary     Account Exporting
 * @description Fetch data form Ethel and export accounts to CSV
 * @version     1.0
 * @file        export.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, Toast, __noToastAjax */

// global lists for storing references to accounts being exported
var EXPORT_ACCOUNTS = {
  pending: [], // accounts listed for this export run
  success: [], // accounts which were already exported
  error: [],   // account for which the export failed
  output: []   // exported data buffer (this is downloaded by the user)
}

/**
 * Represents Account which is being exported
 *
 * Handles its export process, DOM init, display and status updating
 * @class
 * @param {string} id - current counter value for the id
 * @param {Object} data - data about account: 'username' and 'password'
 */
function ExportAccount (id, data) {
  this.dom = $('#' + id + '_export-item')
  this.data = data

  /**
   * Export workflow method
   * @function
   * @param {Object} toast - reference to the loading toast on the export page
   */
  this.export = function (toast) {
    var parent = this

    // Define what should be displayed when the export is done
    var output = function () {
      // Procceed only if all accounts are done (successfully exported of failed)
      if (EXPORT_ACCOUNTS['success'].length + EXPORT_ACCOUNTS['error'].length === EXPORT_ACCOUNTS['pending'].length) {
        // remove loading toast
        toast.destroy(1)

        // display the error toast if needed
        if (EXPORT_ACCOUNTS['error'].length) {
          // get a list of failed usernames
          var failed = EXPORT_ACCOUNTS['error'].map(function (account) {
            return account.data['username']
          })

          // initialize the Toast and display
          var msg = 'Failed to export account(s): <br />' + failed.toString().split(',').join('<br />')
          var failure = new Toast('error', '', msg)
          failure.show()
        }

        // display success toast if any account succeeded
        if (EXPORT_ACCOUNTS['success'].length) {
          // get a list of account names
          var succeed = EXPORT_ACCOUNTS['success'].map(function (account) {
            return account.data['username']
          })

          // initialize the Toast and display (set to fade out after a while)
          msg = 'Exported account(s): <br />' + succeed.toString().split(',').join('<br />')
          var success = new Toast('success', '', msg)
          success.show(); success.destroy(10000)
        } else {
          // if there are no successfully exported accounts, return
          return
        }

        // create a temporary download button with all the exported data encoded
        var tmp_button = $('<a id="download"></a>')
        tmp_button.attr({
          href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(EXPORT_ACCOUNTS['output']),
          download: 'exported_accounts.csv'
        }).css({display: 'none'})

        // add the button to the page, click it and remove it
        tmp_button.appendTo('#export')
        tmp_button[0].click()
        tmp_button.remove()
      }
    }

    // when exporting is in progress, remove the X button
    $('.list-view-pf-actions .remove', this.dom).addClass('hidden')
    // show spinner to indicate some action
    $('.list-view-pf-actions .progress-spinner', this.dom).removeClass('hidden')

    // perform the request
    __noToastAjax(data, '/account/get', {
      method: 'get',
      callbacks: {
        success: function (resp) {
          // request went fine, save the reference in the 'success' list
          EXPORT_ACCOUNTS['success'].push(parent)

          // start building CSV line by adding 'username' and 'password'
          var line = [data['username'], data['password']]

          // parse each pool in 'pools'
          for (var i = 0; i < resp.data['pools'].length; i++) {
            line.push(resp.data['pools'][i]['sku'])
            // export all unlimited quantities as 10000 (for compatibility with previous Account Tool)
            if (resp.data['pools'][i]['quantity'] === 'unlimited') {
              resp.data['pools'][i]['quantity'] = 10000
            }
            line.push(resp.data['pools'][i]['quantity'])
          }

          // create a string form the Array and add it to the output
          line = line.join(',')
          EXPORT_ACCOUNTS['output'] = EXPORT_ACCOUNTS['output'] + line + '\n'

          // show indication that the export is done
          $('.list-view-pf-left', parent.dom).html('<span class="pficon pficon-ok"></span>')
          $('.list-view-pf-actions .remove', parent.dom).removeClass('hidden')
          $('.list-view-pf-actions .progress-spinner', parent.dom).addClass('hidden')

          // try if we're done
          output()
        },
        failure: function (e) {
          // account failed, push it to the 'error' list
          EXPORT_ACCOUNTS['error'].push(parent)

          // show in-list indication that if went wrong and what was the reason
          $('.list-view-pf-left', parent.dom).html('<span class="pficon pficon-error-circle-o"></span>')
          $('.list-view-pf-main-info', parent.dom).prop('title', '<ul class="list-unstyled"><li><span class="pficon pficon-error-circle-o"></span>' + e.msg + '</li></ul>').attr({
            'data-toggle': 'tooltip',
            'data-placement': 'bottom',
            'data-html': true
          })
          $('[data-toggle="tooltip"]', parent.dom).tooltip()

          // hide spinner and enable X back
          $('.list-view-pf-actions .remove', parent.dom).removeClass('hidden')
          $('.list-view-pf-actions .progress-spinner', parent.dom).addClass('hidden')

          // try if we're done
          output()
        }
      }
    })
  }
}

/**
 * Initialize Export View
 *
 * Init the 'filters' (account line in the list) from the template. Bind the
 * action for adding a new row and action for removing a row.
 */
function initExport () {
  // initialize the export filters from template
  $('.export-template').each(function () {
    var init = $(this).clone(true)
    $('input', init).each(function () {
      var name = '0_' + $(this).attr('name')
      $(this).attr('name', name)
      $(this).prop('required', true)
    })
    init.removeClass('export-template')
      .addClass('export-filter')
      .attr({id: '0_export-item'})
      .insertAfter(this)
  })
  // now remove templates to avoid bothering by redundant fields
  $('.export-template').remove()

  // bind the action on adding a new filter
  $('#export .add-filter').click(function (e) {
    // enable the remove button
    $('#export .remove').removeClass('hidden')

    // clone the last line and append it to the form
    var last_filter = $('.export-filter').last()
    var clone = last_filter.clone(true)

    // increment field name indexes and set the id
    var id = parseInt(clone.attr('id').split('_')[0], 10) + 1
    clone.attr({'id': id + '_export-item'})
    $('input', clone).each(function () {
      var name = $(this).attr('name').split('_', 2)
      var idx = parseInt(name[0], 10) + 1
      $(this).attr('name', idx + '_' + name[1])
    })

    // insert the filter after the last line
    clone.insertAfter(last_filter)
  })

  // add the remove line button action
  $('#export .remove').click(function (e) {
    // remove line
    $(this).closest('.export-filter').remove()
    // if only one line is left, hide all remove buttons in #export
    if ($('.export-filter').size() === 1) {
      $('#export .remove').addClass('hidden')
    }
  })
}

/**
 * Call the initExport when page is loaded and bind form submitting action
 */
$(document).ready(function () {
  initExport()

  $('#export-form').submit(function (event) {
    // when sumbit, reset the global lists
    EXPORT_ACCOUNTS = {
      pending: [],
      success: [],
      error: [],
      output: []
    }
    event.preventDefault()

    // create loading toast
    var l = new Toast('loading', '', 'Exporting accounts')
    l.show()

    // retrieve data form the form
    var data = $(this).serializeArray().reduce(function (obj, item) {
      var tmp = item['name'].split('_', 2)
      if (!(tmp[0] in obj)) {
        obj[tmp[0]] = {}
      }
      obj[tmp[0]][tmp[1]] = item['value']
      return obj
    }, {})

    for (var item in data) {
      // initialize every account as ExportAccount object with ID matching it's
      // index in data array
      var account = new ExportAccount(item, data[item])

      // run the export and add the account into 'pending' list
      account.export(l)
      EXPORT_ACCOUNTS['pending'].push(account)
    }
  })
})
