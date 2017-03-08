/**
 * @summary     Toast notification
 * @description Class for notifications, handles it's display/fade out etc.
 * @version     1.0
 * @file        toast.js
 * @author      Tomas Coufal
 *
 * Licensed under the MIT license
 */

/* global $, REPORT_URL */

/**
 * Toast notification
 *
 * Class representation for a notification with a priority and message
 * @class
 * @param {string} type - notification priority/purpose, applicable values:
 *    'loading', 'success', 'error', 'warning'
 * @param {string} id - use specific HTML id attribute (enables the DOM can be
 *    targeted even when the reference to the Toast instance is lost or not
 *    available)
 * @param {string} content - notification message
 * @param {function} action - if additional action is needed and this function
 *    is defined, a special button is displayed on the notification and this
 *    action is binded to a click event
 */
function Toast (type, id, content, action) {
  this.id = id

  // define parts of the notification:
  var t_action = '' // additional buttons
  var t_class = ''  // notification type specific CSS classes
  var t_icon = ''   // notification type specific icon

  // based on the type populate the parts defined above
  switch (type) {
    case 'loading':
      t_class = 'alert-info'
      t_icon = '<div class="pficon"><div class="spinner"></div></div>'
      break
    case 'error':
      t_class = 'alert-danger alert-dismissable'
      t_action = '<div class="pull-right toast-pf-action"><a href="' + REPORT_URL + '" target="_blank">File a bug</a></div>'
      t_icon = '<span class="pficon pficon-error-circle-o"></span>'
      break
    case 'warning':
      t_class = 'alert-warning'
      t_action = '<div class="pull-right toast-pf-action"><button class="btn btn-link" ' +
                 'title="Stop furter action on this account">Kill it!</button></div>'
      t_icon = '<span class="pficon pficon-warning-triangle-o"></span>'
      break
    case 'success':
      t_class = 'alert-success'
      t_icon = '<span class="pficon pficon-ok"></span>'
      break
  }
  // if the toast should be dismissable, add the close button
  if (t_class.indexOf('alert-dismissable') > -1) {
    t_action = '<button type="button" class="close" ' +
               'data-dismiss="alert" aria-hidden="true">' +
               '<span class="pficon pficon-close"></span></button>' + t_action
  }

  // build the DOM
  this.content = $('<div id="' + id + '" class="toast-pf pull-right alert ' + t_class + '">' + t_action + t_icon + content + '</div>')

  // in case an action should be invoked
  if (action) { $('button', this.content).click(function (e) { action() }) }

  /**
   * Show the Toast
   *
   * Append the Toast's DOM node into the HTML document using some fancy
   * animation.
   * @function
   */
  this.show = function () {
    this.content.appendTo('#messages')
      .css({'margin-top': 50, opacity: 0})
      .animate({'margin-top': 0, opacity: 1}, 200)
  }

  // destroy animation with optional delay and hover interrupt
  /**
   * Remove the Toast
   *
   * Proceed the animation on notification timeout and remove the node from the
   * document. By default the timeout (removal delay) is reset on each mouseover.
   * @function
   * @param {integer} time - delay after which the notification should disappear
   * @param {boolean} nohover - when set the 'mouseover' event no longer resets
   *     the timer
   */
  this.destroy = function (time, nohover) {
    // if there's an id use it
    var that = (this.id !== '') ? $('#' + this.id) : this.content
    var parent = this
    // use default delay if it's not set by the caller
    time = time === undefined ? 10000 : time

    // if the delay is set to 0, it means the notification should be removed
    // immediately (used for example for loading Toasts)
    if (time === 0) {
      that.remove()
      parent.show = function () { return } // disable it to show again
      return
    }

    // Schedule the remove operation for now+'time' (with animation)
    that.data('timer', setTimeout(function () {
      that.animate({opacity: 0}, 100)
      that.slideUp(200, function () {
        that.remove()
      })
    }, time))

    // If 'hover' is enabled, interrupt the timer and reschedule on mouseout
    if (!nohover) {
      $(this.content).hover(function () {
        $(this).stop(true, true)
        clearTimeout($(this).data('timer'))
      },
      function () { // reschedule on mouseout
        parent.destroy(time, nohover)
      })
    }
  }
}
