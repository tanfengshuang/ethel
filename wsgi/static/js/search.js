/**
 * @summary     Search the SKU DB
 * @description Handles UI of search form as well as the data retrieval and display
 * @version     1.0
 * @file        search.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, Toast, layout, __serializeForm, URL, Blob */

// set the default value on load to prevent keeping the old data (if changed)
/**
 * Initial values in forms
 *
 * Set the default value on load to prevent keeping the old data (if changed).
 * Using backed up data from the data-value and data-label properties.
 */
function initSearchFormValues () {
  // define all the fields that should be watched closely and corrected
  var targets = [
    $('#search_basic_form input[type=hidden][name=category]'),
    $('#search_advanced_form input[type=hidden][name=compare]'),
    $('#search_advanced_form input[type=hidden][name=attribute]')
  ]

  // iterate over fields
  for (var i = 0; i < targets.length; i++) {
    // get value and label
    var first = targets[i].parent().next('ul').children('li').eq(0)
    var value = first.attr('data-value')
    var label = first.attr('data-label')

    // set value and label
    targets[i].val = value
    targets[i].parent().prev('span[data-bind=sel-label]').text = label
  }
}

/**
 * UI handler for the #search_basic
 *
 * Toggle between "search by SKU ID" and "PH: Product name"
 */
function searchFormBasic () {
  $('#search_basic_form .bs-dropdown-to-select-group .dropdown-menu li').click(function (event) {
    var target = $(event.currentTarget)

    // hide all input fields in the form
    target.closest('.input-group').find('.form-control').addClass('hidden')

    // display the one matching selected field
    target.closest('.input-group').find("[name='" + target.attr('data-value') + "']").removeClass('hidden')
    return false
  })
}

/**
 * UI handler for the #search_advanced
 *
 * Based on datatype show proper comparison operators
 */
function searchFormAdvanced () {
  // initialize the search form from template
  $('.filter-template').each(function () {
    // clone template and change names
    var init = $(this).clone(true)
    $('input', init).each(function () {
      var name = '0_' + $(this).attr('name')
      $(this).attr('name', name)
    })
    init.removeClass('filter-template').addClass('filter').insertAfter(this)

    // initialize the checkbox as switch
    $('input[type="checkbox"]', init).bootstrapSwitch()
  })

  // now remove templates to avoid conflicts caused by redundant fields
  $('.filter-template').remove()

  // bind action to attribute's dropdown selection
  $('.toolbar-pf-stackable .attribute .dropdown-menu li').click(function (event) {
    var target = $(event.currentTarget)

    // get corresponding line in form
    var line = $(this).closest('.filter')

    // hide current input box (for this datatype)
    $("[class*='apply_to_datatype_']", line).addClass('hidden')
    $("input[class*='apply_to_datatype_']", line).prop('required', false)

    // show the input field for the correct data type
    $('.apply_to_datatype_' + target.attr('data-type'), line).removeClass('hidden')
    $("input[class*='apply_to_datatype_" + target.attr('data-type') + "']", line)
      .prop('required', true)

    return false
  })

  // toggle disabled/enabled input field when the comparison doesn't require a value
  // for integer fields
  $('.toolbar-pf-stackable .apply_to_datatype_int .dropdown-menu li').click(function (event) {
    // get the affected filter
    var line = $(this).closest('.filter')

    // toggle disable and required attribute
    $("input[name$='data_int']", line)
      .prop('disabled', $(this).hasClass('novalue'))
      .prop('required', !($(this).hasClass('novalue')))
    return false
  })

  // the same for string filters
  $('.toolbar-pf-stackable .apply_to_datatype_string .dropdown-menu li').click(function (event) {
    // get the affected filter
    var line = $(this).closest('.filter')

    // toggle disable and required attribute
    $("input[name$='data_string']", line)
      .prop('disabled', $(this).hasClass('novalue'))
      .prop('required', !($(this).hasClass('novalue')))
    return false
  })

  // bind adding a new filter line action to the (+) button
  $('.toolbar-pf-stackable .add_filter').click(function (e) {
    // enable the remove button when there's more than one line
    $('.toolbar-pf-stackable .filter .remove_filter').css({display: 'table-cell'})

    // get the last applied filter that is gonna be cloned
    var last_filter = $('.toolbar-pf-stackable .filter').last()

    // disable switch for the replicated line (to avoid dependency and conflict with the new line)
    $('input[type="checkbox"]', last_filter).bootstrapSwitch('destroy')

    // clone the filter
    var clone = last_filter.clone(true)

    // increment field name indexes, if they don't exist create them
    $('input', clone).each(function () {
      var name = $(this).attr('name')
      var idx = parseInt(name.split('_')[0], 10) + 1
      $(this).attr('name', idx + name.substr(1))
    })

    // insert as the last filter
    clone.insertAfter(last_filter)

    // initialize bool switches for the new line and reinitialize for the previous one
    $('input[type="checkbox"]', clone).bootstrapSwitch()
    $('input[type="checkbox"]', last_filter).bootstrapSwitch()
  })

  // add the remove filter action to the (-) button
  $('.toolbar-pf-stackable .remove_filter').click(function (e) {
    // remove the line
    $(this).parent().remove()

    // if there's only one line left, hide remove button
    if ($('.toolbar-pf-stackable').children('.filter').size() === 1) {
      $('.toolbar-pf-stackable .remove_filter').css({display: 'none'})
    }
  })
}

/**
 * Visual feedback on the selected dropdown values
 *
 * For the search dropdowns (attribute, comparison operator):
 * In order to give the user a visual feedback, set the dropdown button label to
 * the selected value
 */
function searchFormLabelToggle () {
  // when the dropdown item is clicked
  $('.bs-dropdown-to-select-group .dropdown-menu li').click(function (event) {
    // toggle selected category form value - defines which search key is sent
    var target = $(event.currentTarget)
    target.closest('.bs-dropdown-to-select-group')
          .find('[data-bind="sel-val"]')
          .val(target.attr('data-value'))
          .end()
          .children('.dropdown-toggle')
          .dropdown('toggle')

    // set the datatype (remembered in a hidden field) - used for decision which
    // comparisons should be applied
    target.closest('.bs-dropdown-to-select-group')
          .find('[data-bind="sel-type"]')
          .val(target.attr('data-type'))

    // set the dropdown label
    target.closest('.bs-dropdown-to-select-group')
          .find('[data-bind="sel-label"]')
          .text(target.attr('data-label'))
    return false
  })
}

/**
 * DataTables loading action handler
 *
 * Used to display a loading toast and to set proper viewpoint:
 * Show loading toast when the query starts, hide it when done.
 * Show the search progress bar and animate it to 70% when search starts.
 * Hide the table when search starts.
 * When the search is done, finish the progress bar and show the table
 * @param {Object} e - jQuery event object
 * @param {Object} settings - DataTables settings object
 * @param {boolean} processing - indicate if the query begins or ends
 */
function loadingSearchToast (e, settings, processing) {
  var t = new Toast('loading', 'loading_notification', 'Searching the database...')

  // in case search begins, draw progress bar and hide table in the query meantime
  if (processing) {
    $('#search_pending').toggleClass('hidden', !processing)
    $('#search_result').toggleClass('hidden', processing)
    $('#search_pending .progress-bar').css({width: '0%'}).animate({width: '70%'}, 250)

    // show the laoding toast
    if (!$('#loading_notification').length) t.show()
  } else {
    // hide loading toast
    t.destroy(100, true)

    // finish the progress bar
    $('#search_pending .progress-bar').animate({width: '100%'}, 100)
    setTimeout(function () {
      $('#search_pending').toggleClass('hidden', !processing)
      $('#search_result').toggleClass('hidden', processing)
    }, 400)
  }

  // toggle download buttons when data are (not) available
  $('#search .download-button.download-all').toggleClass('disabled', processing)
  if (processing) {
    $('#search .download-button.download-selected').addClass('disabled')
    $('#search .download-button.download-selected span.counter').text('0')
  }
}

/**
 * DataTables error action handler
 *
 * Show error toast when something went wrong during the query
 * @param {Object} e - jQuery event object
 * @param {Object} settings - DataTables settings object
 * @param {integer} techNote - error reference number
 * @param {string} message - error description
 */
function searchTableError (e, settings, techNote, message) {
  var content = '<strong>What a shame</strong>. DB is refusing to cooperate.'
  var t = new Toast('error', '', content)
  t.show()
  t.destroy()

  // log the error into the console
  console.log('An error occurred for search results table: ', message)
}

/**
 * DataTables initialization
 *
 * Set up the DataTables:
 *   - error and loading handlers
 *   - column layout
 *   - how the query is done (AJAX setup)
 *   - visual settings
 * Add the column visibility button separately and and adjust general appearance
 * @param {string} url - the AJAX endpoint
 * @param {Object} data - the query to send
 * @param {Array} layout - the attribute order
 */
function searchTableInit (url, data, layout) {
  // compute the table column layout form global 'layout' variable
  var cols = []
  for (var i = 0; i < layout.length; i++) {
    cols.push({'data': layout[i]})
  }

  // disable default error handler
  $.fn.dataTable.ext.errMode = 'none'

  // Initialize Datatables
  var table = $('#search_result .datatable')
    // bind the loading handler
    .off('processing.dt', loadingSearchToast)
    .on('processing.dt', loadingSearchToast)
    // bind the error handler
    .off('error.dt', searchTableError)
    .on('error.dt', searchTableError)
    // initialize DataTables
    .DataTable({
      stateSave: true, // remember shown columns
      ajax: { // set up the data retrieval process
        url: '/search',
        type: 'POST',
        data: function (d) {
          return JSON.stringify(data)
        },
        dataType: 'json',
        contentType: 'application/json'
      },
      columns: cols, // use the desired layout
      colReorder: true, // FIXME: not working
      deferRender: true, // render only the visible data to speed up the process
      dom: '<"dataTables_header">t<"dataTables_footer"Lip>', // customize the appereance
      language: { // set our own messages
        loadingRecords: '', // in-table loading message
        info: 'Found <strong>_TOTAL_</strong> relevant SKUs', // results counter
        lengthMenu: '_MENU_' // results per page without aby message
      }
    })

  // make the table flat (no wrap on lines, use horizontal scroll instead)
  $('#search_result .datatable').wrap('<div style="overflow:auto;white-space:nowrap;" />')

  // initialize the column visibility button
  var colvis = new $.fn.dataTable.ColVis(table, {
    buttonText: "Columns <span class='caret'></span>",
    showAll: 'Show all',
    showNone: 'Hide all',
    sAlign: 'right',
    exclude: [ 0 ] // exclude the SKU ID column
  })

  // Draw colVis button and adjust its appearance
  $(colvis.button())
    .insertBefore('.toolbar-pf-actions .form-group .btn-group:last')
    .addClass('btn-group')

  // adjust the results per page menu placement
  $('#results-per-page').empty()
  $('#search_result .dataTables_length')
    .appendTo('#results-per-page')

  // show all table setting related buttons
  $('.toolbar-pf-actions .form-group.hidden').removeClass('hidden')

  // update pagination layout and appearance
  $('#search_result .dataTables_paginate .pagination-input input')
    .addClass('form-control')
    .css('display', 'inline')
}

/**
 * Bind action to labels toggle (verbose or Candlepin internals)
 *
 * Compute which labels should be shown and display them using the CSS display
 * property. Uses a dynamically generated CSS which is placed in the HTML, so
 * the rules can be applied even on the columns which are currently hidden. This
 * ensures that when the column is shown a proper label is displayed.
 */
function labelsToggle () {
  $('#verbose, #internal').click(function (e) {
    // avoid closing the dropdown
    e.stopPropagation()

    // get the other one which is not clicked (to ensure that at least one is
    // shown)
    var otherId = ((this.id === 'verbose') ? 'internal' : 'verbose')

    // show/hide the desired label (if at least one is still visible)
    var status = ''
    if (!$(this).hasClass('selected')) {
      $(this).addClass('selected')
    } else if ($('#' + otherId).hasClass('selected')) {
      $(this).removeClass('selected')
      status += '.' + this.id + '{display:none}'
    }

    // hide the other one if it should be hidden
    if (!$('#' + otherId).hasClass('selected')) {
      status += '.' + otherId + '{display:none}'
    }

    // hide line break if only one label is visible
    if (!$(this).hasClass('selected') || !$('#' + otherId).hasClass('selected')) {
      status += '.datatable th > br {display:none}'
    }

    // place the generated CSS rules into the HTML document
    $('#dynamic_css').text(status)
  })

  // set up default - hide internal labels on init
  $('#dynamic_css').text('.datatable th > br {display:none}.internal{display:none}')
}

// Enable search downloading

/**
 * Enable the search results downloading
 *
 * Compute which data should be downloaded and offer them to the user.
 * Bind proper actions to the download buttons.
 */
function downloadData () {
  // Process the data in background and prepare the link's action
  var blob = false
  var download = function (e, data) {
    // use the HTML5 Blob object to store big amount of data
    blob = URL.createObjectURL(new Blob([JSON.stringify(data)], {type: 'application/json'}))
    $(e.originalEvent.currentTarget).attr({
      href: blob,
      download: 'exported_search.json'
    })
  }

  // bind click events for both buttons
  $('#search .download-button.download-all a').click(function (e) {
    if ($(this).parent().hasClass('disabled')) { e.preventDefault(); return }
    // use all data
    var raw_data = $.makeArray($('#search_result .datatable').DataTable().data())
    download(e, raw_data)
  })
  $('#search .download-button.download-selected a').click(function (e) {
    if ($(this).parent().hasClass('disabled')) { e.preventDefault(); return }
    // use the selected lines only
    var raw_data = $.makeArray($('#search_result .datatable').DataTable().rows('.selected').data())
    download(e, raw_data)
  })

  // destroy the Blob object when not needed anymore
  $('#search .download-button').mouseup(function () {
    URL.revokeObjectURL(blob)
  })
}

/**
 * When page is loaded, proceed with all the UI specific functions mentioned
 * above and bind the search forms submit actions. Build the search query
 * according to the API specs.
 */
$(document).ready(function () {
  initSearchFormValues()
  searchFormLabelToggle()
  searchFormBasic()
  searchFormAdvanced()
  labelsToggle()
  downloadData()

  // perform the basic search
  $('#search_basic_form').submit(function (event) {
    event.preventDefault()

    // hide the placeholder
    $('#search_placeholder').addClass('hidden')

    // get form data
    var raw_data = __serializeForm(this)

    // process them into the form acceptable by the API
    var data = []
    if (!(raw_data[raw_data['category']] === 'all')) {
      data.push({'key': raw_data['category'],
                 'value': raw_data[raw_data['category']],
                 'operator': raw_data['category'] === 'id' ? 'contains' : 'equals'})
    };
    // initialize table and load data
    searchTableInit('/search', data, layout)
  })

  // perform the advanced search
  $('#search_advanced_form').submit(function (event) {
    event.preventDefault()

    // hide the placeholder
    $('#search_placeholder').addClass('hidden')

    // get full data from the form in a scheme:
    // {
    //     <line_id_number>: {
    //         attribute: <search_key>,
    //         compare_int: <integer_comparison>,
    //         compare_string: <string_comparison>,
    //         data_bool: <desired_bool_value>,
    //         data_int: <desired_int_value>,
    //         data_string: <desired_string_value>,
    //         datatype: <which_data_and_comparison_is_valid>
    //     },
    //     next line, etc..
    // }
    var raw_data = $(this).serializeArray().reduce(function (obj, item) {
      // split input fields item.name into:
      //   idx: line identificator
      //   name: the input field actual identificator (purpose of the field)
      //   type: datatype (if input field is related and dependent on one)
      var tmp = item.name.split('_', 3)
      var idx = tmp[0], name = tmp[1], type = tmp[2]
      // if the insex is present, push it into the dict
      if (!isNaN(idx)) {
        if (!obj[idx]) obj[idx] = {}
        if (type) name = name + '_' + type
        obj[idx][name] = item.value
      }
      return obj
    }, {})

    // parse the raw form data in order to filter just the desired values and
    // create a dictionary in API acceptable format
    var data = []
    // iterate over each line
    for (var key in raw_data) {
      var item = raw_data[key]

      // based on selected datatype, get proper value
      var value = item['data_' + item['datatype']]

      // the same for the comarison criteria
      var compare = item['compare_' + item['datatype']]

      // use specific comparison for booleans
      if (item['datatype'] === 'bool') {
        value = value === 'on'
        compare = 'equals'
      }

      // when integer is the type, convert the value
      if (item['datatype'] === 'int') {
        value = parseInt(value, 10)
      }

      // push the expression into the query
      data.push({'key': item['attribute'],
                 'value': value,
                 'operator': compare})
    }

    // initialize table and load data
    searchTableInit('/search', data, layout)
  })
})
