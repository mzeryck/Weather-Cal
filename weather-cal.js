// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: calendar;

/*

~

Welcome to Weather Cal. 
Run this script to set up your widget.

You can duplicate this script to create multiple widgets. Make sure to change the name of the script each time.

Adjust the layout and other settings below.
Happy scripting!

~

*/

/*
 * SETTINGS
 * Adjust the settings of your widget.
 * ===================================
 */

const settings = {
  widget: {

    // Set the locale code. Leave blank "" to match the device's locale.
    locale: ""
    
    // Set to imperial for Fahrenheit, or metric for Celsius
    ,units: "imperial"

    // The size of the widget preview in the app.
    ,preview: "large"

    // Set the padding around each item. Default is 5.
    ,padding: 5

    // Decide if icons should match the color of the text around them.
    ,tintIcons: false
  },
  
/*
 * LAYOUT
 * Decide what items to show on the widget.
 * ========================================
 */

// You always need to start with "row" and "column" items. Set the width of a column with parentheses, like "column(90)".

// Adding left, right, or center will align everything after that. Add "space" for a flexible space, or "space(50)" for a specific height.

// There are many possible items, including: date, greeting, events, reminders, current, future, forecast, battery, sunrise, text

  layout: `
  
  row 
    column
      date
      sunset
      battery
      space
      events
    
    column(90)
      current
      future
       
  `,
  
/*
 * LOCALIZATION
 * Change the language or wording of text displayed.
 * =================================================
 */  
 
  localization: {
  
    // The text shown if you add a greeting item to the layout.
    nightGreeting: "Good night."
    ,morningGreeting: "Good morning."
    ,afternoonGreeting: "Good afternoon."
    ,eveningGreeting: "Good evening."
  
    // The text shown if you add a future weather item to the layout, or tomorrow's events.
    ,nextHourLabel: "Next hour"
    ,tomorrowLabel: "Tomorrow"

    // Shown when noEventBehavior is set to "message".
    ,noEventMessage: "Enjoy the rest of your day."
  
    // The text shown after the hours and minutes of an event duration.
    ,durationMinute: "m"
    ,durationHour: "h"   
  },
 
/*
 * ITEMS
 * Choose how each item is displayed.
 * ==================================
 */  
   
  // DATE
  // ====
  date: {

    // If set to true, date will become smaller when events are displayed.
    dynamicDateSize: true

    // If the date is not dynamic, should it be large or small?
    ,staticDateSize: "small"

    // Determine the date format for each date type. See docs.scriptable.app/dateformatter
    ,smallDateFormat: "EEEE, MMMM d"
    ,largeDateLineOne: "EEEE,"
    ,largeDateLineTwo: "MMMM d"
  },
  
  // EVENTS
  // ======
  events: {

    // How many events to show.
    numberOfEvents: 3

    // Show all-day events.
    ,showAllDay: true

    // Show tomorrow's events.
    ,showTomorrow: true

    // Can be blank "" or set to "duration" or "time" to display how long an event is.
    ,showEventLength: "duration"

    // Set which calendars for which to show events. Empty [] means all calendars.
    ,selectCalendars: []

    // Leave blank "" for no color, or specify shape (circle, rectangle) and/or side (left, right).
    ,showCalendarColor: "rectangle left"
  
    // When no events remain, show a hard-coded "message", a "greeting", or "none".
    ,noEventBehavior: "message"
  },
  
  // REMINDERS
  // =========
  reminders: {
  
    // How many reminders to show. Use 0 for all.
    numberOfReminders: 3

    // Set to true for a relative due date ("in 3 hours") instead of absolute ("3:00 PM")
    ,useRelativeDueDate: false
  
    // Set to true to show reminders without a due date. Default is false.
    ,showWithoutDueDate: false
  
    // Show reminders that are overdue.
    ,showOverdue: true

    // Set which calendars for which to show events. Empty [] means all calendars.
    ,selectLists: []

    // Leave blank "" for no color, or specify shape (circle, rectangle) and/or side (left, right).
    ,showListColor: "rectangle left"
  },

  // SUNRISE
  // =======
  sunrise: {
  
    // How many minutes before/after sunrise or sunset to show this element. 0 for always.
    showWithin: 0
  },

  // WEATHER
  // =======
  weather: {
  
    // Show the location of the current weather.
    showLocation: false
    
    // Show the condition and temperature horizontally. Default is false.
    ,horizontalCondition: true
  
    // Show the text description of the current conditions.
    ,showCondition: false

    // Show today's high and low temperatures.
    ,showHighLow: true

    // Set the hour (in 24-hour time) to switch to tomorrow's weather. Set to 24 to never show it.
    ,tomorrowShownAtHour: 20

    // Set the amount of days to show in the forecast item.
    ,showDays: 3
    
    // Set the format for each day of the week in the forecast item.
    ,showDaysFormat: "E"
    
    // Set to true to show today's weather in the forecast item.
    ,showToday: false
  },

/*
 * FONTS
 * Change the size, color, and font of various text elements.
 * ==========================================================
 */ 
 
  font: {
  
    // Set the default font and color.
    defaultText: { size: 14, color: "ffffff", font: "regular" },
  
    // Any blank values will use the default.
    smallDate:   { size: 17, color: "", font: "semibold" },
    largeDate1:  { size: 30, color: "", font: "light" },
    largeDate2:  { size: 30, color: "", font: "light" },
  
    greeting:    { size: 30, color: "", font: "semibold" },
    eventLabel:  { size: 14, color: "", font: "semibold" },
    eventTitle:  { size: 14, color: "", font: "semibold" },
    eventTime:   { size: 14, color: "ffffffcc", font: "" },
    noEvents:    { size: 30, color: "", font: "semibold" },
  
    largeTemp:   { size: 34, color: "", font: "light" },
    smallTemp:   { size: 14, color: "", font: "" },
    tinyTemp:    { size: 12, color: "", font: "" },
  
    customText:  { size: 14, color: "", font: "" },
  
    battery:     { size: 14, color: "", font: "medium" },
    sunrise:     { size: 14, color: "", font: "medium" },
  },
}

/*
 * CODE
 * Be more careful editing this section. 
 * =====================================
 */

// Names of Weather Cal elements.
const codeFilename = "Weather Cal code"
const gitHubUrl = "https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal-code.js"

// Determine if the user is using iCloud.
let files = FileManager.local()
const iCloudInUse = files.isFileStoredIniCloud(module.filename)

// If so, use an iCloud file manager.
files = iCloudInUse ? FileManager.iCloud() : files

// Determine if the Weather Cal code exists and download if needed.
const pathToCode = files.joinPath(files.documentsDirectory(), codeFilename + ".js")
if (!files.fileExists(pathToCode)) {
  const req = new Request(gitHubUrl)
  const codeString = await req.loadString()
  files.writeString(pathToCode, codeString)
}

// Import the code.
if (iCloudInUse) { await files.downloadFileFromiCloud(pathToCode) }
const code = importModule(codeFilename)

// Run the initial setup or settings menu.
if (config.runsInApp) {
  const showPreview = await code.runSetup(Script.name(), iCloudInUse, codeFilename, gitHubUrl)
  if (!showPreview) return
}

// Set up the widget.
const widget = await code.createWidget(settings, Script.name(), iCloudInUse)
Script.setWidget(widget)

// If we're in app, display the preview.
if (config.runsInApp) {
  const preview = settings.widget.preview
  if (preview == "small") { widget.presentSmall() }
  else if (preview == "medium") { widget.presentMedium() }
  else if (preview == "large") { widget.presentLarge() }
}

Script.complete()
