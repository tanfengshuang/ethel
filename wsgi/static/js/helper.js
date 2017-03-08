/**
 * @summary     AJAX helpers and form data serialization
 * @description Perform the AJAX requests to Ethel and process the responses
 * @version     1.0
 * @file        helper.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, Toast, REPORT_URL_CANDLEPIN */

/**
 * Perform an AJAX request in UI
 *
 * This AJAX request does:
 *  - call the Ethel
 *  - display loading Toast before response arrives
 *  - show error/success Toasts when the request is completed
 *  - initiate the callbacks if set
 *
 * @param {Object} data - data to send (will be dumped as JSON)
 * @param {string} url - the API endpoint
 * @param {Object} options - a dictionary containing request's parameters and
 *    settings, possible options are:
 *    {
 *      method: <GET or POST>,
 *      timeout: <request timeout>,
 *      callbacks: { <functions to run after the AJAX is done
 *        success: func(resp) {},
 *        failure: func(resp) {}
 *      },
 *      labels: { <toast texts>
 *        loading: '',
 *        success: '',
 *        failure: ''
 *      },
 *      skip_toast_success: false,
 *      persistent_toast_error: false
 *    }
 */
function __simpleAJAX (data, url, options) {
  // set default options
  options.method = options.method || 'post'
  options.labels.loading = options.labels.loading || 'Fetching Data'
  var toast_timeout = 5000

  // show loading toast
  var l = new Toast('loading', '', options.labels.loading)
  l.show()

  // prepare the true AJAX options
  var ajax_opts = {
    url: url,
    dataType: 'json',
    timeout: options.timeout,
    success: function (resp) {
      // success callback
      // hide loading Toast and request-too-long-warning Toast
      l.destroy(0); w.destroy(0)

      // show success toast if enabled
      if (!options.skip_toast_success) {
        options.labels.success = options.labels.success || resp.msg
        var d = new Toast('success', '', options.labels.success)
        d.show(); d.destroy(toast_timeout)
      }

      // if there's a callback specified, call it!
      if (!options.callbacks) return
      options.callbacks.success && options.callbacks.success(resp)
    },
    error: function (err, reason) {
      // error callback
      if (reason === 'abort') {
        // if the request has been aborted, show appropriate message
        // hide loading Toast and request-too-long-warning Toast
        l.destroy(0); w.destroy(0)
        var e = new Toast('error', '', "Requests were aborted. We can't ensure the result. Sorry for inconvenience.")
        e.show(); e.destroy(toast_timeout)
        return
      }

      // Define error message
      var msg = 'Request timeout, please try again'
      try {
        msg = $.parseJSON(err.responseText).msg
      } catch (e) {
        msg = err.responseText ? err.responseText : e
      }

      // show error Toast
      // hide loading Toast and request-too-long-warning Toast
      var d = new Toast('error', '', msg)
      l.destroy(0); w.destroy(0); d.show()

      // if persistent_toast_error is set, make the Toast persistent
      if (!options.persistent_toast_error) {
        d.destroy(toast_timeout)
      }

      // if there's a callback specified, call it!
      if (!options.callbacks) return
      options.callbacks.failure && options.callbacks.failure(err)
    }
  }

  // specify the method of tha call and dump data
  if (options.method === 'get' || options.method === 'GET') {
    $.extend(ajax_opts, {data: data, type: 'get'})
  } else {
    $.extend(ajax_opts, {data: JSON.stringify(data), type: 'post', contentType: 'application/json'})
  }

  // perform request
  var request = $.ajax(ajax_opts)

  // warning toast for a situation: request takes too long
  var w = new Toast('warning',
                    '',
                    'This request takes too long. The problem is neither on your side nor ours. ' +
                    "The API we're using can be pretty unstable sometimes.<br><br>" +
                    "You can <a href='" + REPORT_URL_CANDLEPIN + "' target='_blank'>file a bug</a> against it " +
                    "if you want (please include <strong>'Stage Customer Portal Subscription Services'</strong> " +
                    'in description). Sorry for inconvenience.',
                    function () { request.abort() })

  // show the warning after 30s from the request start
  setTimeout(function () {
    w.show()
  }, 30000)
}

/**
 * Perform an AJAX request in background
 *
 * This AJAX request does:
 *  - call the Ethel
 *  - run callbacks if set
 *
 * @param {Object} data - data to send (will be dumped as JSON)
 * @param {string} url - the API endpoint
 * @param {Object} options - a dictionary containing request's parameters and
 *    settings, possible options are:
 *    {
 *      method: <GET or POST>,
 *      callbacks: { <functions to run after the AJAX is done
 *        success: func(resp) {},
 *        failure: func(resp) {}
 *      }
 *    }
 */
function __noToastAjax (data, url, options) {
  // set defaults
  options.method = options.method || 'post'

  // build a dictionary of AJAX options
  var ajax_opts = {
    url: url,
    dataType: 'json',
    success: function (resp) {
      // if there's a callback specified, call it!
      options.callbacks.success && options.callbacks.success(resp)
    },
    error: function (err, time) {
      // get the message and set it as err.msg
      var resp = ''
      try {
        resp = $.parseJSON(err.responseText).msg
      } catch (e) {
        resp = err.responseText ? err.responseText : e
      }
      err.msg = resp
      // if there's a callback specified, call it!
      options.callbacks.failure && options.callbacks.failure(err)
    }
  }

  // based on the method dump the data
  if (options.method === 'get' || options.method === 'GET') {
    $.extend(ajax_opts, {data: data, type: 'get'})
  } else {
    $.extend(ajax_opts, {data: JSON.stringify(data), type: 'post', contentType: 'application/json'})
  }

  // run the request
  $.ajax(ajax_opts)
}

/**
 * Serialize data from the form
 *
 * Produces a dictionary of keys and values when form is sent in format:
 *   {'<field_name>': <field_value>}
 * @param {Object} object - the form jQuery instance
 */
function __serializeForm (object) {
  var data = $(object).serializeArray().reduce(function (obj, item) {
    obj[item.name] = item.value
    return obj
  }, {})
  // we're not using CSFR tokens because the API is not creating any sessions
  delete data['csrf_token']
  return data
}
