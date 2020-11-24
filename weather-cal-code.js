// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: calendar;

/*

~

This is the Weather Cal code script.
Don't delete it or change its name.

To update, run a Weather Cal widget script.
In the popup, tap "Update code". 
It will update to the newest version.

~

*/

// Warn the user if this script is added to a widget.
if (config.runsInWidget) {
  let infoWidget = new ListWidget()
  infoWidget.addText('The "Weather Cal code" script is not intended to be used as a widget. Please use a Weather Cal widget script instead.')
  Script.setWidget(infoWidget)
  Script.complete()
}

// Set up the widget.
module.exports.runSetup = async (name, iCloudInUse, codeFilename, gitHubUrl) => {
  return await setup(name, iCloudInUse, codeFilename, gitHubUrl)
}

// Return the widget.
module.exports.createWidget = async (layout, name, iCloudInUse) => {
  return await makeWidget(layout, name, iCloudInUse)
}

/*
 * Un-comment the section below to test the widget code.
 */

// const layout = `
//   
//   row 
//     column
//       date
//       space
//       events
//     
//     column(90)
//       current
//       future
//       space
//        
//   `
// 
// let w = await makeWidget(layout, "Weather Cal widget", true)
// w.presentLarge()

async function setup(name, iCloudInUse, codeFilename, gitHubUrl) {
  
  const fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
  const prefName = "weather-cal-preferences-" + name
  const prefPath = fm.joinPath(fm.libraryDirectory(), prefName)
  const widgetUrl = "https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal.js"
  
  // If no setup file exists, this is the initial Weather Cal setup.
  const setupPath = fm.joinPath(fm.libraryDirectory(), "weather-cal-setup")
  if (!fm.fileExists(setupPath)) { return await initialSetup() }
  
  // If a settings file exists for this widget, we're editing settings.
  const widgetpath = fm.joinPath(fm.libraryDirectory(), "weather-cal-" + name)
  if (fm.fileExists(widgetpath)) { return await editSettings() }
  
  // Otherwise, we're setting up this particular widget.
  await generateAlert("Weather Cal is set up, but you need to choose a background for this widget.",["Continue"])
  writePreference(prefName, defaultSettings())
  return await setWidgetBackground() 

  // Run the initial setup.
  async function initialSetup() {
  
    // Welcome the user and make sure they like the script name.
    let message = "Welcome to Weather Cal. Make sure your script has the name you want before you begin."
    let options = ['I like the name "' + name + '"', "Let me go change it"]
    let shouldExit = await generateAlert(message,options)
    if (shouldExit) return
  
    // Welcome the user and check for permissions.
    message = "Next, we need to check if you've given permissions to the Scriptable app. This might take a few seconds."
    options = ["Check permissions"]
    await generateAlert(message,options)
  
    let errors = []
    try { await Location.current() } catch { errors.push("location") }
    try { await CalendarEvent.today() } catch { errors.push("calendar") }
    try { await Reminder.all() } catch { errors.push("reminders") }
  
    let issues
    if (errors.length > 0) { issues = errors[0] }
    if (errors.length == 2) { issues += " and " + errors[1] }
    if (errors.length == 3) { issues += ", " + errors[1] + ", and " + errors[2] }
  
    if (issues) { 
      message = "Scriptable does not have permission for " + issues + ". Some features may not work without enabling them in the Settings app."
      options = ["Continue setup anyway", "Exit setup"]
    } else {
      message = "Your permissions are enabled."
      options = ["Continue setup"]
    }
    shouldExit = await generateAlert(message,options)
    if (shouldExit) return
  
    // Set up the weather integration.
    message = "To display the weather on your widget, you need an OpenWeather API key."
    options = ["I already have a key", "I need to get a key", "I don't want to show weather info"]
    const weather = await generateAlert(message,options)
  
    // Show a web view to claim the API key.
    if (weather == 1) {
      message = "On the next screen, sign up for OpenWeather. Find the API key, copy it, and close the web view. You will then be prompted to paste in the key."
      options = ["Continue"]
      let weather = await generateAlert(message,options)
  
      let webView = new WebView()
      webView.loadURL("https://openweathermap.org/home/sign_up")
      await webView.present()
    }
  
    // We need the API key if we're showing weather.
    if (weather < 2) {
      const response = await getWeatherKey(true)
      if (!response) return
    }
  
    // Set up background image.
    await setWidgetBackground()
    
    // Write the default settings to disk.
    writePreference(prefName, defaultSettings())
    
    // Record setup completion.
    writePreference("weather-cal-setup", "true")
    
    message = "Your widget is ready! You'll now see a preview. Re-run this script to edit the default preferences, including localization. When you're ready, add a Scriptable widget to the home screen and select this script."
    options = ["Show preview"]
    await generateAlert(message,options)
  
    // Return and show the preview.
    return previewValue()
 
  }

  // Edit the widget settings.
  async function editSettings() {
    let message = "Widget Setup"
    let options = ["Show widget preview", "Change background", "Edit preferences", "Re-enter API key", "Update code", "Reset widget", "Exit settings menu"]
    const response = await generateAlert(message,options)
  
    // Return true to show the widget preview.
    if (response == 0) {
      return previewValue()
    } 
  
    // Set the background and show a preview.
    if (response == 1) {
      await setWidgetBackground()
      return true
    }
  
    // Display the preferences panel.
    if (response == 2) {
      await editPreferences()
      return
    }
    
    // Set the API key.
    if (response == 3) {
      await getWeatherKey()
      return
    }
    
    if (response == 4) {
      // Prompt the user for updates.
      message = "Would you like to update the Weather Cal code? Your widgets will not be affected."
      options = ["Update", "Exit"]
      const updateResponse = await generateAlert(message,options)
  
      // Exit if the user didn't want to update.
      if (updateResponse) return
      
      // Try updating the code.
      const success = await downloadCode(codeFilename, gitHubUrl)
      message = success ? "The update is now complete." : "The update failed. Please try again later."
      options = ["OK"]

      await generateAlert(message,options)
      return
    }
    
    // Reset the widget.
    if (response == 5) {
      const alert = new Alert()
      alert.message = "Are you sure you want to completely reset this widget?"
      alert.addDestructiveAction("Reset")
      alert.addAction("Cancel")
    
      const cancelReset = await alert.present()
      if (cancelReset == 0) {
        const bgPath = fm.joinPath(fm.libraryDirectory(), "weather-cal-" + name)
        if (fm.fileExists(bgPath)) { fm.remove(bgPath) }
        if (fm.fileExists(prefPath)) { fm.remove(prefPath) }
        const success = await downloadCode(name, widgetUrl)
        message = success ? "This script has been reset. Close the script and reopen it for the change to take effect." : "The reset failed."
        options = ["OK"]
        await generateAlert(message,options)
      }
      return
    }
    
    // If response was Exit, just return.
    return
  }

  // Get the weather key, optionally determining if it's the first run.
  async function getWeatherKey(firstRun = false) {
 
    // Prompt for the key.
    const returnVal = await promptForText("Paste your API key in the box below.",[""],["82c29fdbgd6aebbb595d402f8a65fabf"])
    const apiKey = returnVal.textFieldValue(0)
  
    let message, options
    if (!apiKey || apiKey == "" || apiKey == null) {
      message = "No API key was entered. Try copying the key again and re-running this script."
      options = ["Exit"]
      await generateAlert(message,options)
      return false
    }
    
    // Save the key.
    writePreference("weather-cal-api-key", apiKey)
  
    // Test to see if the key works.
    const req = new Request("https://api.openweathermap.org/data/2.5/onecall?lat=37.332280&lon=-122.010980&appid=" + apiKey)
  
    let val = {}
    try { val = await req.loadJSON() } catch { val.current = false }
    
    // Warn the user if it didn't work.
    if (!val.current) {
      message = firstRun ? "New OpenWeather API keys may take a few hours to activate. Your widget will start displaying weather information once it's active." : "The key you entered, " + apiKey + ", didn't work. If it's a new key, it may take a few hours to activate."
      options = [firstRun ? "Continue" : "OK"]
      await generateAlert(message,options)
      
    // Otherwise, confirm that it was saved.
    } else if (val.current && !firstRun) {
      message = "The new key worked and was saved."
      options = ["OK"]
      await generateAlert(message,options)
    }
  
    // If we made it this far, we did it.
    return true
  }

  // Set the background of the widget.
  async function setWidgetBackground() {

    // Prompt for the widget background.
    let message = "What type of background would you like for your widget?"
    let options = ["Solid color", "Automatic gradient", "Custom gradient", "Image from Photos"]
    let backgroundType = await generateAlert(message,options)
  
    let background = {}
    let returnVal
    if (backgroundType == 0) {
      background.type = "color"
      returnVal = await promptForText("Enter the hex value of the background color you want.",[""],["#007030"])
      background.color = returnVal.textFieldValue(0)

    } else if (backgroundType == 1) {
      background.type = "auto"
      
    } else if (backgroundType == 2) {
      background.type = "gradient"
      returnVal = await promptForText("Enter the hex value of the first gradient color.",[""],["#007030"])
      background.initialColor = returnVal.textFieldValue(0)
      returnVal = await promptForText("Enter the hex value of the second gradient color.",[""],["#007030"])
      background.finalColor = returnVal.textFieldValue(0)
    
    } else if (backgroundType == 3) {
      background.type = "image"
      
      // Create the Weather Cal directory if it doesn't already exist.
      const dirPath = fm.joinPath(fm.documentsDirectory(), "Weather Cal")
      if (!fm.fileExists(dirPath) || !fm.isDirectory(dirPath)) {
        fm.createDirectory(dirPath)
      }
      
      // Determine if a dupe already exists.
      const dupePath = fm.joinPath(dirPath, name + " 2.jpg")
      const dupeAlreadyExists = fm.fileExists(dupePath)
      
      // Get the image and write it to disk.
      const img = await Photos.fromLibrary()
      const path = fm.joinPath(dirPath, name + ".jpg")
      fm.writeImage(path, img)
      
      // If we just created a dupe, alert the user.
      if (!dupeAlreadyExists && fm.fileExists(dupePath)) {
        message = "Weather Cal detected a duplicate image. Please open the Files app, navigate to Scriptable > Weather Cal, and make sure the file named " + name + ".jpg is correct."
        options = ["OK"]
        const response = generateAlert(message,options)
      }
    }
      
    writePreference("weather-cal-" + name, background)
    return previewValue() 
  }
  
  // Return the default widget settings.
  function defaultSettings() {
    const settings = {
    
      widget: {
        name: "Overall settings",
        locale: {
          val: "",
          name: "Locale code",
          description: "Leave blank to match the device's locale.",
        },
        units: {
          val: "imperial",
          name: "Units",
          description: "Use imperial for Fahrenheit or metric for Celsius.",
          type: "enum",
          options: ["imperial","metric"],
        },
        preview: {
          val: "large",
          name: "Widget preview size",
          description: "Set the size of the widget preview displayed in the app.",
          type: "enum",
          options: ["small","medium","large"],
        },
        padding: {
          val: "5",
          name: "Padding",
          description: "The padding around each item. Default is 5.",
        },
        tintIcons: {
          val: false,
          name: "Icons match text color",
          description: "Decide if icons should match the color of the text around them.",
          type: "bool",
        },
      },

      localization: {
        name: "Localization and text customization",
        morningGreeting: {
          val: "Good morning.",
          name: "Morning greeting",
        },
        afternoonGreeting: {
          val: "Good afternoon.",
          name: "Afternoon greeting",
        },
        eveningGreeting: {
          val: "Good evening.",
          name: "Evening greeting",
        },
        nightGreeting: {
          val: "Good night.",
          name: "Night greeting",
        },
        nextHourLabel: {
          val: "Next hour",
          name: "Label for next hour of weather",
        },
        tomorrowLabel: {
          val: "Tomorrow",
          name: "Label for tomorrow",
        },
        noEventMessage: {
          val: "Enjoy the rest of your day.",
          name: "No event message",
          description: "The message shown when there are no more events for the day, if that setting is active.",
        },
        durationMinute: {
          val: "m",
          name: "Duration label for minutes",
        },
        durationHour: {
          val: "h",
          name: "Duration label for hours",
        },
        covid: {
          val: "{cases} cases, {deaths} deaths, {recovered} recoveries",
          name: "COVID data text",
          description: "Each {token} is replaced with the number from the data. The available tokens are: cases, todayCases, deaths, todayDeaths, recovered, active, critical, casesPerOneMillion, deathsPerOneMillion, totalTests, testsPerOneMillion"
        },
        week: {
          val: "Week",
          name: "Label for the week number",
        },
      },
  
      font: {
        name: "Text sizes, colors, and fonts",
        defaultText: {
          val: { size: "14", color: "ffffff", font: "regular" },
          name: "Default font settings",
          description: "These settings apply to all text on the widget that doesn't have a customized value.",
          type: "multival",
        },
        smallDate:   {
          val: { size: "17", color: "", font: "semibold" },
          name: "Small date",
          type: "multival",
        },
        largeDate1:  {
          val: { size: "30", color: "", font: "light" },
          name: "Large date, line 1",
          type: "multival",
        },
        largeDate2:  {
          val: { size: "30", color: "", font: "light" },
          name: "Large date, line 2",
          type: "multival",
        },
        greeting:    {
          val: { size: "30", color: "", font: "semibold" },
          name: "Greeting",
          type: "multival",
        },
        eventLabel:  {
          val: { size: "14", color: "", font: "semibold" },
          name: "Event heading (used for the TOMORROW label)",
          type: "multival",
        },
        eventTitle:  {
          val: { size: "14", color: "", font: "semibold" },
          name: "Event title",
          type: "multival",
        },
        eventTime:   {
          val: { size: "14", color: "ffffffcc", font: "" },
          name: "Event time",
          type: "multival",
        },
        noEvents:    {
          val: { size: "30", color: "", font: "semibold" },
          name: "No events message",
          type: "multival",
        },
        reminderTitle:  {
          val: { size: "14", color: "", font: "" },
          name: "Reminder title",
          type: "multival",
        },
        reminderTime:   {
          val: { size: "14", color: "ffffffcc", font: "" },
          name: "Reminder time",
          type: "multival",
        },
        largeTemp:   {
          val: { size: "34", color: "", font: "light" },
          name: "Large temperature label",
          type: "multival",
        },
        smallTemp:   {
          val: { size: "14", color: "", font: "" },
          name: "Most text used in weather items",
          type: "multival",
        },
        tinyTemp:    {
          val: { size: "12", color: "", font: "" },
          name: "Small text used in weather items",
          type: "multival",
        },
        customText:  {
          val: { size: "14", color: "", font: "" },
          name: "User-defined text items",
          type: "multival",
        },
        battery:     {
          val: { size: "14", color: "", font: "medium" },
          name: "Battery percentage",
          type: "multival",
        },
        sunrise:     {
          val: { size: "14", color: "", font: "medium" },
          name: "Sunrise and sunset",
          type: "multival",
        },
        covid:       {
          val: { size: "14", color: "", font: "medium" },
          name: "COVID data",
          type: "multival",
        },
        week:        {
          val: { size: "14", color: "", font: "light" },
          name: "Week label",
          type: "multival",
        },
      },

      date: {
        name: "Date",
        dynamicDateSize: {
          val: true,
          name: "Dynamic date size",
          description: "If set to true, the date will become smaller when events are displayed.",
          type: "bool",
        },
        staticDateSize: {
          val: "small",
          name: "Static date size",
          description: "Set the date size shown when dynamic date size is not enabled.",
          type: "enum",
          options: ["small","large"],
        },
        smallDateFormat: {
          val: "EEEE, MMMM d",
          name: "Small date format",
        },
        largeDateLineOne: {
          val: "EEEE,",
          name: "Large date format, line 1",
        }, 
        largeDateLineTwo: {
          val: "MMMM d",
          name: "Large date format, line 2",
        }, 
      },

      events: {
        name: "Events",
        numberOfEvents: {
          val: "3",
          name: "Maximum number of events shown",
        }, 
        minutesAfter: {
          val: "5",
          name: "Minutes after event",
          description: "Number of minutes after an event begins that it should still be shown.",
        }, 
        showAllDay: {
          val: false,
          name: "Show all-day events",
          type: "bool",        
        },
        showTomorrow: {
          val: "20",
          name: "Tomorrow's events shown at hour",
          description: "The hour (in 24-hour time) to start showing tomorrow's events. Use 0 for always, 24 for never.",
        }, 
        showEventLength: {
          val: "duration",
          name: "Event length display style",
          description: "Choose whether to show the duration, the end time, or no length information.",
          type: "enum",
          options: ["duration","time","none"],
        }, 
        selectCalendars: {
          val: "",
          name: "Calendars to show",
          description: "Write the names of each calendar separated by commas, like this: Home,Work,Personal. Leave blank to show events from all calendars.",
        }, 
        showCalendarColor: {
          val: "rectangle left",
          name: "Display calendar color",
          description: "Choose the shape and location of the calendar color.",
          type: "enum",
          options: ["rectangle left","rectangle right","circle left","circle right","none"],
        }, 
        noEventBehavior: {
          val: "message",
          name: "Show when no events remain",
          description: "When no events remain, show a hard-coded message, a time-based greeting, or nothing.",
          type: "enum",
          options: ["message","greeting","none"],
        }, 
      },

      reminders: {
        name: "Reminders",
        numberOfReminders: {
          val: "3",
          name: "Maximum number of reminders shown",
        }, 
        useRelativeDueDate: {
          val: false,
          name: "Use relative dates",
          description: "Set to true for a relative due date (in 3 hours) instead of absolute (3:00 PM).",
          type: "bool",
        },
        showWithoutDueDate: {
          val: false,
          name: "Show reminders without a due date",
          type: "bool",
        },
        showOverdue: {
          val: false,
          name: "Show overdue reminders",
          type: "bool",
        },
        todayOnly: {
          val: false,
          name: "Hide reminders due after today",
          type: "bool",
        },
        selectLists: {
          val: "",
          name: "Lists to show",
          description: "Write the names of each list separated by commas, like this: Home,Work,Personal. Leave blank to show reminders from all lists.",
        }, 
        showListColor: {
          val: "rectangle left",
          name: "Display list color",
          description: "Choose the shape and location of the list color.",
          type: "enum",
          options: ["rectangle left","rectangle right","circle left","circle right","none"],
        }, 
      },

      sunrise: {
        name: "Sunrise and sunset",
        showWithin: {
          val: "",
          name: "Limit times displayed",
          description: "Set how many minutes before/after sunrise or sunset to show this element. Leave blank to always show.",
        }, 
        separateElements: {
          val: false,
          name: "Use separate sunrise and sunset elements",
          description: "By default, the sunrise element changes between sunrise and sunset times automatically. Set to true for individual, hard-coded sunrise and sunset elements.",
          type: "bool",
        },
      },

      weather: {
        name: "Weather",
        showLocation: {
          val: false,
          name: "Show location name",
          type: "bool",
        },
        horizontalCondition: {
          val: false,
          name: "Display the condition and temperature horizontally",
          type: "bool",
        },
        showCondition: {
          val: false,
          name: "Show text value of the current condition",
          type: "bool",
        },
        showHighLow: {
          val: true,
          name: "Show today's high and low temperatures",
          type: "bool",
        },
        showRain: {
          val: false,
          name: "Show percent chance of rain",
          type: "bool",
        },
        tomorrowShownAtHour: {
          val: "20",
          name: "When to switch to tomorrow's weather",
          description: "Set the hour (in 24-hour time) to switch from the next hour to tomorrow's weather. Use 0 for always, 24 for never.",
        }, 
        showDays: {
          val: "3",
          name: "Number of days shown in the forecast item",
        }, 
        showDaysFormat: {
          val: "E",
          name: "Date format for the forecast item",
        }, 
        showToday: {
          val: true,
          name: "Show today's weather in the forecast item",
          type: "bool",
        },
      },

      covid: {
        name: "COVID data",
        country: {
          val: "USA",
          name: "Country for COVID information",
        }, 
        url: {
          val: "https://covid19.who.int",
          name: "URL to open when the COVID data is tapped",
        }, 
      },
    }
    return settings
  }

  // Load or reload a table full of preferences.
  async function loadTable(table,category,settingsObject) {
    table.removeAllRows()
    for (key in category) {
      // Don't show the name as a setting.
      if (key == "name") continue
    
      // Make the row.
      const row = new UITableRow()
      row.dismissOnSelect = false
      row.height = 55
    
      // Fill it with the setting information.
      const setting = category[key]
    
      let valText
      if (typeof setting.val == "object") {
        for (subItem in setting.val) {
          const setupText = subItem + ": " + setting.val[subItem]
          if (!valText) {
            valText = setupText
            continue
          }
          valText += ", " + setupText
        }
      } else {
        valText = setting.val + ""
      }
    
      const cell = row.addText(setting.name,valText)
      cell.subtitleColor = Color.gray()
    
      // If there's no type, it's just text.
      if (!setting.type) {
        row.onSelect = async () => {
          const returnVal = await promptForText(setting.name,[setting.val],[],setting.description)
          setting.val = returnVal.textFieldValue(0)
          loadTable(table,category,settingsObject)
        }
  
      } else if (setting.type == "enum") {
        row.onSelect = async () => {
          const returnVal = await generateAlert(setting.name,setting.options,setting.description)
          setting.val = setting.options[returnVal]
          await loadTable(table,category,settingsObject)
        }
    
      } else if (setting.type == "bool") {
        row.onSelect = async () => {
          const returnVal = await generateAlert(setting.name,["true","false"],setting.description)
          setting.val = !returnVal
          await loadTable(table,category,settingsObject)
        }
    
      } else if (setting.type == "multival") {
        row.onSelect = async () => {
      
          // We need an ordered set.
          let keys = []
          let values = []
          for (const item in setting.val) {
            keys.push(item)
            values.push(setting.val[item])
          }
      
          const returnVal = await promptForText(setting.name,values,keys,setting.description)
        
          for (let i=0; i < keys.length; i++) {
            const currentKey = keys[i]
            setting.val[currentKey] = returnVal.textFieldValue(i)
          }
        
          await loadTable(table,category,settingsObject)
        }
      }
      // Add it to the table.
      table.addRow(row)
    }
  
    table.reload()
  }

  async function editPreferences() {

    // Get the preferences object.
    let settingsObject
    if (!fm.fileExists(prefPath)) {
      await generateAlert("No preferences file exists. If you're on an older version of Weather Cal, you need to reset your widget in order to use the preferences editor.",["OK"])
      return
    
    } else {
      const settingsFromFile = JSON.parse(fm.readString(prefPath))
      settingsObject = defaultSettings()
      
      // Iterate through the settings object.
      if (settingsFromFile.widget.units.val == undefined) {
        console.log("loading new settings file from disk")
        for (category in settingsObject) {
          for (item in settingsObject[category]) {
          
            // If the setting exists, use it. Otherwise, the default is used.
            if (settingsFromFile[category][item] != undefined) {
              settingsObject[category][item].val = settingsFromFile[category][item]
            }
            
          }
        }
        
      // Fix for old preference files.
      } else {
        console.log("loading directly from disk (old preference file)")
        settingsObject = settingsFromFile
      }
    }
  
    // Create the settings table.
    const table = new UITable()
    table.showSeparators = true
  
    // Iterate through each item in the settings object.
    for (key in settingsObject) {
    
      // Make the row.
      let row = new UITableRow()
      row.dismissOnSelect = false
    
      // Fill it with the category information.
      const category = settingsObject[key]
      row.addText(category.name)
      row.onSelect = async () => {
        const subTable = new UITable()
        subTable.showSeparators = true
        await loadTable(subTable,category,settingsObject)
        await subTable.present()
      }
    
      // Add it to the table.
      table.addRow(row)
    }
    await table.present()
    
    // Upon dismissal, roll up preferences and write to disk.
    for (category in settingsObject) {
      for (item in settingsObject[category]) {
        if (item == "name") continue
        settingsObject[category][item] = settingsObject[category][item].val
      }
    }
    writePreference(prefName, settingsObject)
  }
  
  // Return the widget preview value.
  function previewValue() {
    if (fm.fileExists(prefPath)) {
      let settingsObject = JSON.parse(fm.readString(prefPath))
      return settingsObject.widget.preview || settingsObject.widget.preview.val
    } else {
      return "large"
    }
  }
  
  // Download a Scriptable script.
  async function downloadCode(filename, url) {
    const pathToCode = fm.joinPath(fm.documentsDirectory(), filename + ".js")
    const req = new Request(url)

    try {
      const codeString = await req.loadString()
      fm.writeString(pathToCode, codeString)
      return true
    } catch {
      return false
    }
  }
  
  // Generate an alert with the provided array of options.
  async function generateAlert(title,options,message = null) {
  
    const alert = new Alert()
    alert.title = title
    if (message) alert.message = message
  
    for (const option of options) {
      alert.addAction(option)
    }
  
    const response = await alert.presentAlert()
    return response
  }
  
  // Prompt for one or more text field values.
  async function promptForText(title,values,keys,message = null) {
    const alert = new Alert()
    alert.title = title
    if (message) alert.message = message
    
    for (let i=0; i < values.length; i++) {
      alert.addTextField(keys ? (keys[i] || null) : null,values[i] + "")
    }
  
    alert.addAction("OK")
    await alert.present()
    return alert
  }

  // Write the value of a preference to disk.
  function writePreference(filename, value) {
    const path = fm.joinPath(fm.libraryDirectory(), filename)
  
    if (typeof value === "string") {
      fm.writeString(path, value)
    } else {
      fm.writeString(path, JSON.stringify(value))
    }
  }
}

async function makeWidget(layout, name, iCloudInUse) {

  // All widget items must be documented here.
  function provideFunction(name) {
    const functions = {
      battery() { return battery },
      center() { return center },
      column() { return column },
      covid() { return covid },
      current() { return current },
      date() { return date },
      events() { return events },
      forecast() { return forecast },
      future() { return future },
      greeting() { return greeting },
      left() { return left },
      reminders() { return reminders },
      right() { return right },
      row() { return row },
      space() { return space },
      sunrise() { return sunrise },
      sunset() { return sunset },
      text() { return text },
      week() { return week },
    }
    return functions[name] ? functions[name]() : null
  }
  
  // We always need a file manager.
  const files = iCloudInUse ? FileManager.iCloud() : FileManager.local()
  
  // Determine if we're using the old or new setup.
  let settings
  if (typeof layout == "object") {
    settings = layout
    
  } else {
    const prefPath = files.joinPath(files.libraryDirectory(), "weather-cal-preferences-" + name)
    settings = JSON.parse(files.readString(prefPath))
    
    // Fix old preference files.
    if (settings.widget.units.val != undefined) {
      for (category in settings) {
        for (item in settings[category]) {
          settings[category][item] = settings[category][item].val
        }
      }
    }
    settings.layout = layout
  }

  // Get often-used values from the settings object.
  let locale = settings.widget.locale
  const padding = parseInt(settings.widget.padding)
  const tintIcons = settings.widget.tintIcons
  const localizedText = settings.localization
  const textFormat = settings.font

  // Create the other shared variables.
  var data = {}
  const currentDate = new Date()

  // Make sure we have a locale value.
  if (!locale || locale == "" || locale == null) { locale = Device.locale() }
  
  // Set up the widget with padding.
  const widget = new ListWidget()
  const horizontalPad = padding < 10 ? 10 - padding : 10
  const verticalPad = padding < 15 ? 15 - padding : 15
  widget.setPadding(horizontalPad, verticalPad, horizontalPad, verticalPad)
  widget.spacing = 0

  /*
   * BACKGROUND DISPLAY
   * ==================
   */
   
  // Read the background information from disk.
  const backgroundPath = files.joinPath(files.libraryDirectory(), "weather-cal-" + name)
  const backgroundRaw = files.readString(backgroundPath)
  const background = JSON.parse(backgroundRaw)

  if (background.type == "color") {
    widget.backgroundColor = new Color(background.color)
  
  } else if (background.type == "auto") {
    const gradient = new LinearGradient()
    const gradientSettings = await setupGradient()
  
    gradient.colors = gradientSettings.color()
    gradient.locations = gradientSettings.position()
  
    widget.backgroundGradient = gradient
  
  } else if (background.type == "gradient") {
    const gradient = new LinearGradient()
    const initialColor = new Color(background.initialColor)
    const finalColor = new Color(background.finalColor)
    
    gradient.colors = [initialColor, finalColor]
    gradient.locations = [0, 1]
  
    widget.backgroundGradient = gradient
  
  } else if (background.type == "image") {
    
    // Determine if our image exists.
    const dirPath = files.joinPath(files.documentsDirectory(), "Weather Cal")
    const path = files.joinPath(dirPath, name + ".jpg")
    const exists = files.fileExists(path)
  
    // If it exists, load from file.
    if (exists) {
      if (iCloudInUse) { await files.downloadFileFromiCloud(path) }
      widget.backgroundImage = files.readImage(path)
  
    // If it's missing when running in the widget, use a gray background.
    } else if (!exists && config.runsInWidget) {
      widget.backgroundColor = Color.gray() 
    
    // But if we're running in app, prompt the user for the image.
    } else {
      const img = await Photos.fromLibrary()
      widget.backgroundImage = img
      files.writeImage(path, img)
    }
  }
  
  /*
   * CONSTRUCTION
   * ============
   */

  // Set up the layout variables.
  var currentRow = {}
  var currentColumn = {}

  // Set up the initial alignment.
  var currentAlignment = alignLeft

  // Set up the global ASCII variables.
  var foundASCII, usingASCII
  var currentColumns = []
  var rowNeedsSetup = false

  // Process the layout.
  for (line of settings.layout.split(/\r?\n/)) {
    await processLine(line)
  }

  // Finish the widget and return.
  return widget

  /*
   * CONSTRUCTION FUNCTIONS
   * Processing the layout input.
   * ============================
   */
  
  async function processLine(lineInput) {
  
    // Trim the input.
    const line = lineInput.trim()
    
    // If it's blank, return.
    if (line == '') { return }
    
    // If we have a row, we're not using ASCII.
    if (!foundASCII && line.includes('row')) { 
      foundASCII = true
      usingASCII = false 
    
    // If we have a row of dashes, we're using ASCII.
    } else if (!foundASCII && line[0] == '-' && line[line.length-1] == '-') {
      foundASCII = true
      usingASCII = true 
    }
    
    if (usingASCII) { await processASCIILine(line) }
    else { await processRegularLine(line) }
    
  }
  
  // Process a single line of regular layout.
  async function processRegularLine(lineInput) {
    
    let line = lineInput
    
    // If it's using the old style, remove the comma.
    if (line[line.length-1] == ',') {
      line = line.slice(0, -1)
    }
    
    // If there are no parentheses, run the function.
    let item = line.split('(')
    if (!item[1]) {
      const func = provideFunction(item[0])
      await func(currentColumn)
      return
    }
    
    // Otherwise, pass the parameter.
    const param = item[1].slice(0, -1)
    const func = provideFunction(item[0])(parseInt(param) || param)
    await func(currentColumn)
  }
  
  // Processes a single line of ASCII. 
  async function processASCIILine(lineInput) {
  
    const line = lineInput.replace(/\.+/g,'')
  
    // If it's a line, enumerate previous columns (if any) and set up the new row.
    if (line[0] == '-' && line[line.length-1] == '-') { 
      if (currentColumns.length > 0) { await enumerateColumns() }
      rowNeedsSetup = true
      return
    }
  
    // If it's the first content row, finish the row setup.
    if (rowNeedsSetup) { 
      row(currentColumn)
      rowNeedsSetup = false 
    }
  
    // If there's a number, this is a setup row.
    const setupRow = line.match(/\d+/)

    // Otherwise, it has columns.
    const items = line.split('|')
  
    // Iterate through each item.
    for (var i=1; i < items.length-1; i++) {
    
      // If the current column doesn't exist, make it.
      if (!currentColumns[i]) { currentColumns[i] = { items: [] } }
    
      // Now we have a column to add the items to.
      const column = currentColumns[i].items
    
      // Get the current item and its trimmed version.
      const item = items[i]
      const trim = item.trim()
    
      // If it's not a function, figure out spacing.
      if (!provideFunction(trim)) { 
      
        // If it's a setup row, whether or not we find the number, we keep going.
        if (setupRow) {
          const value = parseInt(trim, 10)
          if (value) { currentColumns[i].width = value }
          continue
        }
      
        // If it's blank and we haven't already added a space, add one.
        const prevItem = column[column.length-1]
        if (trim == '' && (!prevItem || (prevItem && !prevItem.startsWith("space")))) {
          column.push("space")
        }
      
        // Either way, we're done.
        continue
    
      }
    
      // Determine the alignment.
      const index = item.indexOf(trim)
      const length = item.slice(index,item.length).length
    
      let align
      if (index > 0 && length > trim.length) { align = "center" }
      else if (index > 0) { align = "right" }
      else { align = "left" }
    
      // Add the items to the column.
      column.push(align)
      column.push(trim)
    }
  }

  // Runs the function names in each column.
  async function enumerateColumns() {
    if (currentColumns.length > 0) {
      for (col of currentColumns) {
        
        // If it's null, go to the next one.
        if (!col) { continue }
      
        // If there's a width, use the width function.
        if (col.width) {
          column(col.width)(currentColumn)
        
        // Otherwise, create the column normally.
        } else {
          column(currentColumn)
        }
        for (item of col.items) {
          const func = provideFunction(item)
          await func(currentColumn)
        }
      }
      currentColumns = []
    }
  }

  /*
   * LAYOUT FUNCTIONS
   * These functions manage spacing and alignment.
   * =============================================
   */

  // Makes a new row on the widget.
  function row(input = null) {

    function makeRow() {
      currentRow = widget.addStack()
      currentRow.layoutHorizontally()
      currentRow.setPadding(0, 0, 0, 0)
      currentColumn.spacing = 0
    
      // If input was given, make a row of that size.
      if (input > 0) { currentRow.size = new Size(0,input) }
    }
  
    // If there's no input or it's a number, it's being called in the layout declaration.
    if (!input || typeof input == "number") { return makeRow }
  
    // Otherwise, it's being called in the generator.
    else { makeRow() }
  }

  // Makes a new column on the widget.
  function column(input = null) {
 
    function makeColumn() {
      currentColumn = currentRow.addStack()
      currentColumn.layoutVertically()
      currentColumn.setPadding(0, 0, 0, 0)
      currentColumn.spacing = 0
    
      // If input was given, make a column of that size.
      if (input > 0) { currentColumn.size = new Size(input,0) }
    }
  
    // If there's no input or it's a number, it's being called in the layout declaration.
    if (!input || typeof input == "number" || typeof input == "string" ) { 
    return makeColumn 
    
    }
  
    // Otherwise, it's being called in the generator.
    else { makeColumn() }
  }

  // Create an aligned stack to add content to.
  function align(column) {
  
    // Add the containing stack to the column.
    let alignmentStack = column.addStack()
    alignmentStack.layoutHorizontally()
  
    // Get the correct stack from the alignment function.
    let returnStack = currentAlignment(alignmentStack)
    returnStack.layoutVertically()
    return returnStack
  }

  // Create a right-aligned stack.
  function alignRight(alignmentStack) {
    alignmentStack.addSpacer()
    let returnStack = alignmentStack.addStack()
    return returnStack
  }

  // Create a left-aligned stack.
  function alignLeft(alignmentStack) {
    let returnStack = alignmentStack.addStack()
    alignmentStack.addSpacer()
    return returnStack
  }

  // Create a center-aligned stack.
  function alignCenter(alignmentStack) {
    alignmentStack.addSpacer()
    let returnStack = alignmentStack.addStack()
    alignmentStack.addSpacer()
    return returnStack
  }

  // This function adds a space, with an optional amount.
  function space(input = null) { 
  
    // This function adds a spacer with the input width.
    function spacer(column) {
  
      // If the input is null or zero, add a flexible spacer.
      if (!input || input == 0) { column.addSpacer() }
    
      // Otherwise, add a space with the specified length.
      else { column.addSpacer(input) }
    }
  
    // If there's no input or it's a number, it's being called in the column declaration.
    if (!input || typeof input == "number") { return spacer }
  
    // Otherwise, it's being called in the column generator.
    else { input.addSpacer() }
  }

  // Change the current alignment to right.
  function right(x) { currentAlignment = alignRight }

  // Change the current alignment to left.
  function left(x) { currentAlignment = alignLeft }

  // Change the current alignment to center.
  function center(x) { currentAlignment = alignCenter }

  /*
   * SETUP FUNCTIONS
   * These functions prepare data needed for items.
   * ==============================================
   */

  // Set up the data.events object.
  async function setupEvents() {
  
    data.events = {}
    const eventSettings = settings.events

    const calSetting = eventSettings.selectCalendars
    let calendars = []
    if (typeof calSetting == "string") {
      calendars = calSetting.length > 0 ? calSetting.split(",") : []
    } else {
      calendars = calSetting
    }
    
    const numberOfEvents = parseInt(eventSettings.numberOfEvents)

    // Function to determine if an event should be shown.
    function shouldShowEvent(event) {
  
      // If events are filtered and the calendar isn't in the selected calendars, return false.
      if (calendars.length && !calendars.includes(event.calendar.title)) { return false }

      // Hack to remove canceled Office 365 events.
      if (event.title.startsWith("Canceled:")) { return false }

      // If it's an all-day event, only show if the setting is active.
      if (event.isAllDay) { return eventSettings.showAllDay }

      // Otherwise, return the event if it's in the future or recently started.
      const minutesAfter = parseInt(eventSettings.minutesAfter) * 60000 || 0
      return (event.startDate.getTime() + minutesAfter > currentDate.getTime())
    }
  
    // Determine which events to show, and how many.
    const todayEvents = await CalendarEvent.today([])
    let shownEvents = 0
    let futureEvents = []
  
    for (const event of todayEvents) {
      if (shownEvents == numberOfEvents) { break }
      if (shouldShowEvent(event)) {
        futureEvents.push(event)
        shownEvents++
      }
    }

    // If there's room and we need to, show tomorrow's events.
    let multipleTomorrowEvents = false
    let showTomorrow = eventSettings.showTomorrow
    
    // Determine if we're specifying an hour to show.
    if (!isNaN(parseInt(showTomorrow))) {
      showTomorrow = (currentDate.getHours() >= parseInt(showTomorrow))
    }
    
    if (showTomorrow && shownEvents < numberOfEvents) {
  
      const tomorrowEvents = await CalendarEvent.tomorrow([])
      for (const event of tomorrowEvents) {
        if (shownEvents == numberOfEvents) { break }
        if (shouldShowEvent(event)) {
      
          // Add the tomorrow label prior to the first tomorrow event.
          if (!multipleTomorrowEvents) { 
          
            // The tomorrow label is pretending to be an event.
            futureEvents.push({ title: localizedText.tomorrowLabel.toUpperCase(), isLabel: true })
            multipleTomorrowEvents = true
          }
        
          // Show the tomorrow event and increment the counter.
          futureEvents.push(event)
          shownEvents++
        }
      }
    }
  
    // Store the future events, and whether or not any events are displayed.
    data.events.futureEvents = futureEvents
    data.events.eventsAreVisible = (futureEvents.length > 0) && (eventSettings.numberOfEvents > 0)
  }

  // Set up the data.reminders object.
  async function setupReminders() {
  
    data.reminders = {}
    const reminderSettings = settings.reminders 
    
    const listSetting = reminderSettings.selectLists
    let lists = []
    if (typeof listSetting == "string") {
      lists = listSetting.length > 0 ? listSetting.split(",") : []
    } else {
      lists = listSetting
    }

    const numberOfReminders = parseInt(reminderSettings.numberOfReminders)
    const showWithoutDueDate = reminderSettings.showWithoutDueDate
    const showOverdue = reminderSettings.showOverdue

    // Function to determine if an event should be shown.
    function shouldShowReminder(reminder) {
      
      // If reminders are filtered and the list isn't in the selected lists, return false.
      if (lists.length && !lists.includes(reminder.calendar.title)) { return false }
    
      // If there's no due date, use the setting.
      if (!reminder.dueDate)  { return showWithoutDueDate }
    
      // If it's overdue, use the setting.
      if (reminder.isOverdue) { return showOverdue }
      
      // If we only want today and overdue, use the setting.
      if (reminderSettings.todayOnly) { 
        return sameDay(reminder.dueDate, currentDate)
      }
      
      // Otherwise, return true.
      return true
    }
  
    // Determine which reminders to show.
    let reminders = await Reminder.allIncomplete()
    
    // Sort in order of due date.
    reminders.sort(function(a, b) {
    
      // Due dates are always picked first.
      if (!a.dueDate && b.dueDate) return 1
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && !b.dueDate) return 0
    
      // Otherwise, earlier due dates go first.
      const aTime = a.dueDate.getTime()
      const bTime = b.dueDate.getTime()
      
      if (aTime > bTime) return 1
      if (aTime < bTime) return -1
      return 0 
    })
  
    // Set the number of reminders shown.
    reminders = reminders.filter(shouldShowReminder).slice(0,numberOfReminders)
    
    // Store the data.
    data.reminders.all = reminders
  }

  // Set up the gradient for the widget background.
  async function setupGradient() {
  
    // Requirements: sunrise
    if (!data.sun) { await setupSunrise() }

    let gradient = {
      dawn: {
        color() { return [new Color("142C52"), new Color("1B416F"), new Color("62668B")] },
        position() { return [0, 0.5, 1] },
      },

      sunrise: {
        color() { return [new Color("274875"), new Color("766f8d"), new Color("f0b35e")] },
        position() { return [0, 0.8, 1.5] },
      },

      midday: {
        color() { return [new Color("3a8cc1"), new Color("90c0df")] },
        position() { return [0, 1] },
      },

      noon: {
        color() { return [new Color("b2d0e1"), new Color("80B5DB"), new Color("3a8cc1")] },
        position() { return [-0.2, 0.2, 1.5] },
      },

      sunset: {
        color() { return [new Color("32327A"), new Color("662E55"), new Color("7C2F43")] },
        position() { return [0.1, 0.9, 1.2] },
      },

      twilight: {
        color() { return [new Color("021033"), new Color("16296b"), new Color("414791")] },
        position() { return [0, 0.5, 1] },
      },

      night: {
        color() { return [new Color("16296b"), new Color("021033"), new Color("021033"), new Color("113245")] },
        position() { return [-0.5, 0.2, 0.5, 1] },
      },
    }

    const sunrise = data.sun.sunrise
    const sunset = data.sun.sunset

    // Use sunrise or sunset if we're within 30min of it.
    if (closeTo(sunrise)<=15) { return gradient.sunrise }
    if (closeTo(sunset)<=15) { return gradient.sunset }

    // In the 30min before/after, use dawn/twilight.
    if (closeTo(sunrise)<=45 && currentDate.getTime() < sunrise) { return gradient.dawn }
    if (closeTo(sunset)<=45 && currentDate.getTime() > sunset) { return gradient.twilight }

    // Otherwise, if it's night, return night.
    if (isNight(currentDate)) { return gradient.night }

    // If it's around noon, the sun is high in the sky.
    if (currentDate.getHours() == 12) { return gradient.noon }

    // Otherwise, return the "typical" theme.
    return gradient.midday
  }

  // Set up the location data object.
  async function setupLocation() {

    // Get the cached location info if it exists.
    const locationPath = files.joinPath(files.libraryDirectory(), "weather-cal-location")
    const locationExists = files.fileExists(locationPath)
    let cachedLocation
    if (locationExists) {
      cachedLocation = JSON.parse(files.readString(locationPath))
    }
    
    // If it's been more than an hour, ask iOS for location.
    let location, geocode
    const timeToCache = 60 * 60 * 1000
    const locationDate = locationExists ? files.modificationDate(locationPath).getTime() : -(timeToCache+1)
    const locationDataOld = (currentDate.getTime() - locationDate) > timeToCache
    if (locationDataOld) {
      try {
        location = await Location.current()
        geocode = location ? await Location.reverseGeocode(location.latitude, location.longitude, locale) : false
      } catch {}
    }
    
    // Store the possible location values in the data object.
    data.location = {}
    
    if (location) {
      data.location.latitude = location.latitude
      data.location.longitude = location.longitude
    } else {
      data.location.latitude = cachedLocation.latitude
      data.location.longitude = cachedLocation.longitude
    }
    
    if (geocode) {
      data.location.locality = (geocode[0].locality || geocode[0].postalAddress.city) || geocode[0].administrativeArea
    } else {
      data.location.locality = cachedLocation.locality
    }
    
    // If we have old location data, save it to disk.
    if (locationDataOld) {
      files.writeString(locationPath, JSON.stringify(data.location))
    }
  }

  // Set up the sun data object.
  async function setupSunrise() {

    // Requirements: location
    if (!data.location) { await setupLocation() }
  
    async function getSunData(date) {
      const req = "https://api.sunrise-sunset.org/json?lat=" + data.location.latitude + "&lng=" + data.location.longitude + "&formatted=0&date=" + date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
      const sunData = await new Request(req).loadJSON()
      return sunData
    }

    // Set up the sunrise/sunset cache.
    const sunCachePath = files.joinPath(files.libraryDirectory(), "weather-cal-sunrise")
    const sunCacheExists = files.fileExists(sunCachePath)
    const sunCacheDate = sunCacheExists ? files.modificationDate(sunCachePath) : 0
    let sunDataRaw

    // If cache exists and was created today, use cached data.
    if (sunCacheExists && sameDay(currentDate, sunCacheDate)) {
      const sunCache = files.readString(sunCachePath)
      sunDataRaw = JSON.parse(sunCache)
    }
  
    // Otherwise, get the data from the server.
    else {

      sunDataRaw = await getSunData(currentDate)
  
      // Calculate tomorrow's date and get tomorrow's data.
      let tomorrowDate = new Date()
      tomorrowDate.setDate(currentDate.getDate() + 1)
      const tomorrowData = await getSunData(tomorrowDate)
      sunDataRaw.results.tomorrow = tomorrowData.results.sunrise
    
      // Cache the file.
      files.writeString(sunCachePath, JSON.stringify(sunDataRaw))
    }

    // Store the timing values.
    data.sun = {}
    data.sun.sunrise = new Date(sunDataRaw.results.sunrise).getTime()
    data.sun.sunset = new Date(sunDataRaw.results.sunset).getTime()
    data.sun.tomorrow = new Date(sunDataRaw.results.tomorrow).getTime()
  }

  // Set up the weather data object.
  async function setupWeather() {
    
    // Get the weather settings.
    const weatherSettings = settings.weather

    // Requirements: location
    if (!data.location) { await setupLocation() }

    // Set up the cache.
    const cachePath = files.joinPath(files.libraryDirectory(), "weather-cal-cache")
    const cacheExists = files.fileExists(cachePath)
    const cacheDate = cacheExists ? files.modificationDate(cachePath) : 0
    let weatherDataRaw

    // If cache exists and it's been less than 60 seconds since last request, use cached data.
    if (cacheExists && (currentDate.getTime() - cacheDate.getTime()) < 60000) {
      const cache = files.readString(cachePath)
      weatherDataRaw = JSON.parse(cache)

    // Otherwise, use the API to get new weather data.
    } else {
    
      // OpenWeather only supports a subset of language codes.
      const openWeatherLang = ["af","al","ar","az","bg","ca","cz","da","de","el","en","eu","fa","fi","fr","gl","he","hi","hr","hu","id","it","ja","kr","la","lt","mk","no","nl","pl","pt","pt_br","ro","ru","sv","se","sk","sl","sp","es","sr","th","tr","ua","uk","vi","zh_cn","zh_tw","zu"]
      var lang
    
      // Find all possible language matches.
      const languages = [locale, locale.split("_")[0], Device.locale(), Device.locale().split("_")[0]]

      for (item of languages) {
        // If it matches, use the value and stop the loop.
        if (openWeatherLang.includes(item)) {
          lang = "&lang=" + item
          break
        }
      }
      
      const apiKeyPath = files.joinPath(files.libraryDirectory(), "weather-cal-api-key")
      const apiKey = files.readString(apiKeyPath)
      
      try {
        const weatherReq = "https://api.openweathermap.org/data/2.5/onecall?lat=" + data.location.latitude + "&lon=" + data.location.longitude + "&exclude=minutely,alerts&units=" + settings.widget.units + lang + "&appid=" + apiKey
        weatherDataRaw = await new Request(weatherReq).loadJSON()
        files.writeString(cachePath, JSON.stringify(weatherDataRaw))
      } catch {}
    }
    
    // If it's an error, treat it as a null value.
    if (weatherDataRaw.cod) { weatherDataRaw = null }
  
    // English continues using the "main" weather description.
    const english = (locale.split("_")[0] == "en")

    // Store the weather values.
    data.weather = {}
    data.weather.currentTemp = weatherDataRaw ? weatherDataRaw.current.temp : null
    data.weather.currentCondition = weatherDataRaw ? weatherDataRaw.current.weather[0].id : 100
    data.weather.currentDescription = weatherDataRaw ? (english ? weatherDataRaw.current.weather[0].main : weatherDataRaw.current.weather[0].description) : "--"
    data.weather.todayHigh = weatherDataRaw ? weatherDataRaw.daily[0].temp.max : null
    data.weather.todayLow = weatherDataRaw ? weatherDataRaw.daily[0].temp.min : null
    data.weather.forecast = [];
    
    for (let i=0; i <= 7; i++) {
      data.weather.forecast[i] = weatherDataRaw ? ({High: weatherDataRaw.daily[i].temp.max, Low: weatherDataRaw.daily[i].temp.min, Condition: weatherDataRaw.daily[i].weather[0].id}) : { High: null, Low: null, Condition: 100 }
    }
    data.weather.tomorrowRain = weatherDataRaw ? weatherDataRaw.daily[1].pop : null

    data.weather.nextHourTemp = weatherDataRaw ? weatherDataRaw.hourly[1].temp : null
    data.weather.nextHourCondition = weatherDataRaw ? weatherDataRaw.hourly[1].weather[0].id : 100
    data.weather.nextHourRain = weatherDataRaw ? weatherDataRaw.hourly[1].pop : null
  }
  
  // Set up the COVID data object.
  async function setupCovid() {
  
    // Set up the COVID cache.
    const cacheCovidPath = files.joinPath(files.libraryDirectory(), "weather-cal-covid")
    const cacheCovidExists = files.fileExists(cacheCovidPath)
    const cacheCovidDate = cacheCovidExists ? files.modificationDate(cacheCovidPath) : 0
    let covidDataRaw

    // If cache exists and it's been less than 900 seconds (15min) since last request, use cached data.
    if (cacheCovidExists && (currentDate.getTime() - cacheCovidDate.getTime()) < 900000) {
      const cacheCovid = files.readString(cacheCovidPath)
      covidDataRaw = JSON.parse(cacheCovid)

    // Otherwise, use the API to get new data.
    } else {
      const covidReq = "https://coronavirus-19-api.herokuapp.com/countries/" + settings.covid.country
      covidDataRaw = await new Request(covidReq).loadJSON()
      files.writeString(cacheCovidPath, JSON.stringify(covidDataRaw))
    }
  
    data.covid = covidDataRaw
  
  }	

  /*
   * WIDGET ITEMS
   * These functions display items on the widget.
   * ============================================
   */

  // Display the date on the widget.
  async function date(column) {
  
    // Get the settings.
    const dateSettings = settings.date

    // Requirements: events (if dynamicDateSize is enabled)
    if (!data.events && dateSettings.dynamicDateSize) { await setupEvents() }

    // Set up the date formatter and set its locale.
    let df = new DateFormatter()
    df.locale = locale
  
    // Show small if it's hard coded, or if it's dynamic and events are visible.
    if (dateSettings.dynamicDateSize ? data.events.eventsAreVisible : dateSettings.staticDateSize == "small") {
      let dateStack = align(column)
      dateStack.setPadding(padding, padding, padding, padding)

      df.dateFormat = dateSettings.smallDateFormat
      let dateText = provideText(df.string(currentDate), dateStack, textFormat.smallDate)
    
    // Otherwise, show the large date.
    } else {
      let dateOneStack = align(column)
      df.dateFormat = dateSettings.largeDateLineOne
      let dateOne = provideText(df.string(currentDate), dateOneStack, textFormat.largeDate1)
      dateOneStack.setPadding(padding/2, padding, 0, padding)
    
      let dateTwoStack = align(column)
      df.dateFormat = dateSettings.largeDateLineTwo
      let dateTwo = provideText(df.string(currentDate), dateTwoStack, textFormat.largeDate2)
      dateTwoStack.setPadding(0, padding, padding, padding)
    }
  }

  // Display a time-based greeting on the widget.
  async function greeting(column) {

    // This function makes a greeting based on the time of day.
    function makeGreeting() {
      const hour = currentDate.getHours()
      if (hour    < 5)  { return localizedText.nightGreeting }
      if (hour    < 12) { return localizedText.morningGreeting }
      if (hour-12 < 5)  { return localizedText.afternoonGreeting }
      if (hour-12 < 10) { return localizedText.eveningGreeting }
      return localizedText.nightGreeting
    }
  
    // Set up the greeting.
    let greetingStack = align(column)
    let greeting = provideText(makeGreeting(), greetingStack, textFormat.greeting)
    greetingStack.setPadding(padding, padding, padding, padding)
  }

  // Display events on the widget.
  async function events(column) {
  
    // Get the event settings.
    const eventSettings = settings.events

    // Requirements: events
    if (!data.events) { await setupEvents() }

    // If no events are visible, figure out what to do.
    if (!data.events.eventsAreVisible) { 
      const display = eventSettings.noEventBehavior
    
      // If it's a greeting, let the greeting function handle it.
      if (display == "greeting") { return await greeting(column) }
    
      // If it's a message, get the localized text.
      if (display == "message" && localizedText.noEventMessage.length) {
        const messageStack = align(column)
        messageStack.setPadding(padding, padding, padding, padding)
        provideText(localizedText.noEventMessage, messageStack, textFormat.noEvents)
      }
    
      // Whether or not we displayed something, return here.
      return
    }
  
    // Set up the event stack.
    let eventStack = column.addStack()
    eventStack.layoutVertically()
    const todaySeconds = Math.floor(currentDate.getTime() / 1000) - 978307200
    eventStack.url = 'calshow:' + todaySeconds
  
    // If there are no events and we have a message, show it and return.
    if (!data.events.eventsAreVisible && localizedText.noEventMessage.length) {
      let message = provideText(localizedText.noEventMessage, eventStack, textFormat.noEvents)
      eventStack.setPadding(padding, padding, padding, padding)
      return
    }
  
    // If we're not showing the message, don't pad the event stack.
    eventStack.setPadding(0, 0, 0, 0)
  
    // Add each event to the stack.
    var currentStack = eventStack
    const futureEvents = data.events.futureEvents
    const showCalendarColor = eventSettings.showCalendarColor
    const colorShape = showCalendarColor.includes("circle") ? "circle" : "rectangle"
    
    for (let i = 0; i < futureEvents.length; i++) {
    
      const event = futureEvents[i]
      const bottomPadding = (padding-10 < 0) ? 0 : padding-10
    
      // If it's the tomorrow label, change to the tomorrow stack.
      if (event.isLabel) {
        let tomorrowStack = column.addStack()
        tomorrowStack.layoutVertically()
        const tomorrowSeconds = Math.floor(currentDate.getTime() / 1000) - 978220800
        tomorrowStack.url = 'calshow:' + tomorrowSeconds
        currentStack = tomorrowStack
      
        // Mimic the formatting of an event title, mostly.
        const eventLabelStack = align(currentStack)
        const eventLabel = provideText(event.title, eventLabelStack, textFormat.eventLabel)
        eventLabelStack.setPadding(padding, padding, padding, padding)
        continue
      }
    
      const titleStack = align(currentStack)
      titleStack.layoutHorizontally()
    
      // If we're showing a color, and it's not shown on the right, add it to the left.
      if (showCalendarColor.length && !showCalendarColor.includes("right")) {
        let colorItemText = provideTextSymbol(colorShape) + " "
        let colorItem = provideText(colorItemText, titleStack, textFormat.eventTitle)
        colorItem.textColor = event.calendar.color
      }

      const title = provideText(event.title.trim(), titleStack, textFormat.eventTitle)
      titleStack.setPadding(padding, padding, event.isAllDay ? padding : padding/5, padding)
    
      // If we're showing a color on the right, show it.
      if (showCalendarColor.length && showCalendarColor.includes("right")) {
        let colorItemText = " " + provideTextSymbol(colorShape)
        let colorItem = provideText(colorItemText, titleStack, textFormat.eventTitle)
        colorItem.textColor = event.calendar.color
      }
  
      // If there are too many events, limit the line height.
      if (futureEvents.length >= 3) { title.lineLimit = 1 }

      // If it's an all-day event, we don't need a time.
      if (event.isAllDay) { continue }
    
      // Format the time information.
      let timeText = formatTime(event.startDate)
    
      // If we show the length as time, add an en dash and the time.
      if (eventSettings.showEventLength == "time") { 
        timeText += "–" + formatTime(event.endDate) 
      
      // If we should it as a duration, add the minutes.
      } else if (eventSettings.showEventLength == "duration") {
        const duration = (event.endDate.getTime() - event.startDate.getTime()) / (1000*60)
        const hours = Math.floor(duration/60)
        const minutes = Math.floor(duration % 60)
        const hourText = hours>0 ? hours + localizedText.durationHour : ""
        const minuteText = minutes>0 ? minutes + localizedText.durationMinute : ""
        const showSpace = hourText.length && minuteText.length
        timeText += " \u2022 " + hourText + (showSpace ? " " : "") + minuteText
      }

      const timeStack = align(currentStack)
      const time = provideText(timeText, timeStack, textFormat.eventTime)
      timeStack.setPadding(0, padding, padding, padding)
    }
  }

  // Display reminders on the widget.
  async function reminders(column) {

    // Requirements: reminders
    if (!data.reminders) { await setupReminders() }
    const reminderSettings = settings.reminders
  
    // Set up the reminders stack.
    let reminderStack = column.addStack()
    reminderStack.layoutVertically()
    reminderStack.setPadding(0, 0, 0, 0)

    // Add each reminder to the stack.
    const reminders = data.reminders.all
    const showListColor = reminderSettings.showListColor
    const colorShape = showListColor.includes("circle") ? "circle" : "rectangle"
  
    for (let i = 0; i < reminders.length; i++) {
    
      const reminder = reminders[i]
      const bottomPadding = (padding-10 < 0) ? 0 : padding-10
    
      const titleStack = align(reminderStack)
      titleStack.layoutHorizontally()
      const showCalendarColor = reminderSettings.showListColor
      const colorShape = showListColor.includes("circle") ? "circle" : "rectangle"
    
      // If we're showing a color, and it's not shown on the right, add it to the left.
      if (showListColor.length && !showListColor.includes("right")) {
        let colorItemText = provideTextSymbol(colorShape) + " "
        let colorItem = provideText(colorItemText, titleStack, textFormat.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }

      const title = provideText(reminder.title.trim(), titleStack, textFormat.reminderTitle)
      titleStack.setPadding(padding, padding, padding/5, padding)
    
      // If we're showing a color on the right, show it.
      if (showListColor.length && showListColor.includes("right")) {
        let colorItemText = " " + provideTextSymbol(colorShape)
        let colorItem = provideText(colorItemText, titleStack, textFormat.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }
    
      // If it doesn't have a due date, keep going.
      if (!reminder.dueDate) { continue }

      // If it's overdue, display in red without a time.
      if (reminder.isOverdue) { 
        title.textColor = Color.red()
        continue 
      }
    
      // Format with the relative style if set.
      let timeText
      if (reminderSettings.useRelativeDueDate) {
        let rdf = new RelativeDateTimeFormatter()
        rdf.locale = locale
        rdf.useNamedDateTimeStyle()
        timeText = rdf.string(reminder.dueDate, currentDate)
      
      // Otherwise, use a normal date, time, or datetime format.
      } else {
        let df = new DateFormatter()
        df.locale = locale
      
        // If it's due today and it has a time, don't show the date.
        if (sameDay(reminder.dueDate, currentDate) && reminder.dueDateIncludesTime) {
          df.useNoDateStyle()
        } else {
          df.useShortDateStyle()
        }
      
        // Only show the time if it's available.
        if (reminder.dueDateIncludesTime) {
          df.useShortTimeStyle()
        } else {
          df.useNoTimeStyle()
        }
      
        timeText = df.string(reminder.dueDate)
      }

      const timeStack = align(reminderStack)
      const time = provideText(timeText, timeStack, textFormat.eventTime)
      timeStack.setPadding(0, padding, padding, padding)
    }
  }

  // Display the current weather.
  async function current(column) {
  
    // Get the weather settings.
    const weatherSettings = settings.weather

    // Requirements: weather and sunrise
    if (!data.weather) { await setupWeather() }
    if (!data.sun) { await setupSunrise() }

    // Set up the current weather stack.
    let currentWeatherStack = column.addStack()
    currentWeatherStack.layoutVertically()
    currentWeatherStack.setPadding(0, 0, 0, 0)
    currentWeatherStack.url = "https://weather.com/weather/today/l/" + data.location.latitude + "," + data.location.longitude
  
    // If we're showing the location, add it.
    if (weatherSettings.showLocation) {
      let locationTextStack = align(currentWeatherStack)
      let locationText = provideText(data.location.locality, locationTextStack, textFormat.smallTemp)
      locationTextStack.setPadding(padding, padding, padding, padding)
    }

    // Show the current condition symbol.
    let mainConditionStack = align(currentWeatherStack)
    let mainCondition = mainConditionStack.addImage(provideConditionSymbol(data.weather.currentCondition,isNight(currentDate)))
    mainCondition.imageSize = new Size(22,22)
    tintIcon(mainCondition, textFormat.largeTemp)
    mainConditionStack.setPadding(weatherSettings.showLocation ? 0 : padding, padding, 0, padding)
    
    // Add the temp horizontally if enabled.
    if (weatherSettings.horizontalCondition) {
      mainConditionStack.addSpacer(5)
      mainConditionStack.layoutHorizontally()
      mainConditionStack.centerAlignContent()
      const tempText = displayNumber(data.weather.currentTemp,"--") + "°"
      const temp = provideText(tempText, mainConditionStack, textFormat.largeTemp)
    }
  
    // If we're showing the description, add it.
    if (weatherSettings.showCondition) {
      let conditionTextStack = align(currentWeatherStack)
      let conditionText = provideText(data.weather.currentDescription, conditionTextStack, textFormat.smallTemp)
      conditionTextStack.setPadding(padding, padding, 0, padding)
    }
    
    // Add the temp vertically if it's not horizontal.
    if (!weatherSettings.horizontalCondition) {
      const tempStack = align(currentWeatherStack)
      tempStack.setPadding(0, padding, 0, padding)
      const tempText = displayNumber(data.weather.currentTemp,"--") + "°"
      const temp = provideText(tempText, tempStack, textFormat.largeTemp)
    }
  
    // If we're not showing the high and low, end it here.
    if (!weatherSettings.showHighLow) { return }

    // Show the temp bar and high/low values.
    let tempBarStack = align(currentWeatherStack)
    tempBarStack.layoutVertically()
    tempBarStack.setPadding(0, padding, padding, padding)
  
    let tempBar = drawTempBar()
    let tempBarImage = tempBarStack.addImage(tempBar)
    tempBarImage.size = new Size(50,0)
  
    tempBarStack.addSpacer(1)
  
    let highLowStack = tempBarStack.addStack()
    highLowStack.layoutHorizontally()
  
    const mainLowText = displayNumber(data.weather.todayLow,"-")
    const mainLow = provideText(mainLowText, highLowStack, textFormat.tinyTemp)
    highLowStack.addSpacer()
    const mainHighText = displayNumber(data.weather.todayHigh,"-")
    const mainHigh = provideText(mainHighText, highLowStack, textFormat.tinyTemp)
  
    tempBarStack.size = new Size(60,30)
  }

  // Display upcoming weather.
  async function future(column) {
  
    // Get the weather settings.
    const weatherSettings = settings.weather

    // Requirements: weather and sunrise
    if (!data.weather) { await setupWeather() }
    if (!data.sun) { await setupSunrise() }

    // Set up the future weather stack.
    let futureWeatherStack = column.addStack()
    futureWeatherStack.layoutVertically()
    futureWeatherStack.setPadding(0, 0, 0, 0)
    futureWeatherStack.url = "https://weather.com/" + locale + "weather/tenday/l/" + data.location.latitude + "," + data.location.longitude

    // Determine if we should show the next hour.
    const showNextHour = (currentDate.getHours() < parseInt(weatherSettings.tomorrowShownAtHour))
  
    // Set the label value.
    const subLabelStack = align(futureWeatherStack)
    const subLabelText = showNextHour ? localizedText.nextHourLabel : localizedText.tomorrowLabel
    const subLabel = provideText(subLabelText, subLabelStack, textFormat.smallTemp)
    subLabelStack.setPadding(0, padding, padding/2, padding)
  
    // Set up the sub condition stack.
    let subConditionStack = align(futureWeatherStack)
    subConditionStack.layoutHorizontally()
    subConditionStack.centerAlignContent()
    subConditionStack.setPadding(0, padding, padding, padding)
  
    // Determine if it will be night in the next hour.
    var nightCondition
    if (showNextHour) {
      const addHour = currentDate.getTime() + (60*60*1000)
      const newDate = new Date(addHour)
      nightCondition = isNight(newDate)
    } else {
      nightCondition = false 
    }
  
    let subCondition = subConditionStack.addImage(provideConditionSymbol(showNextHour ? data.weather.nextHourCondition : data.weather.forecast[1].Condition,nightCondition))
    const subConditionSize = showNextHour ? 14 : 18
    subCondition.imageSize = new Size(subConditionSize, subConditionSize)
    tintIcon(subCondition, textFormat.smallTemp)
    subConditionStack.addSpacer(5)
  
    // The next part of the display changes significantly for next hour vs tomorrow.
    let rainPercent
    if (showNextHour) {
      const subTempText = displayNumber(data.weather.nextHourTemp,"--") + "°"
      const subTemp = provideText(subTempText, subConditionStack, textFormat.smallTemp)
      rainPercent = data.weather.nextHourRain
    
    } else {
      let tomorrowLine = subConditionStack.addImage(drawVerticalLine(new Color((textFormat.tinyTemp && textFormat.tinyTemp.color) ? textFormat.tinyTemp.color : textFormat.defaultText.color, 0.5), 20))
      tomorrowLine.imageSize = new Size(3,28)
      subConditionStack.addSpacer(5)
      let tomorrowStack = subConditionStack.addStack()
      tomorrowStack.layoutVertically()
    
      const tomorrowHighText = displayNumber(data.weather.forecast[1].High,"-")
      const tomorrowHigh = provideText(tomorrowHighText, tomorrowStack, textFormat.tinyTemp)
      tomorrowStack.addSpacer(4)
      const tomorrowLowText = displayNumber(data.weather.forecast[1].Low,"-")
      const tomorrowLow = provideText(tomorrowLowText, tomorrowStack, textFormat.tinyTemp)
      rainPercent = (data.weather.tomorrowRain == null ? "--" : data.weather.tomorrowRain*100)
    }
    
    // If we're showing rain percentage, add it.
    if (weatherSettings.showRain) {
      let subRainStack = align(futureWeatherStack)
      subRainStack.layoutHorizontally()
      subRainStack.centerAlignContent()
      subRainStack.setPadding(0, padding, padding, padding)

      let subRain = subRainStack.addImage(SFSymbol.named("umbrella").image)
      const subRainSize = showNextHour ? 14 : 18
      subRain.imageSize = new Size(subRainSize, subRainSize)
      subRain.tintColor = new Color((textFormat.smallTemp && textFormat.smallTemp.color) ? textFormat.smallTemp.color : textFormat.defaultText.color)
      subRainStack.addSpacer(5)
      
      const subRainText = displayNumber(rainPercent,"--") + "%"
      provideText(subRainText, subRainStack, textFormat.smallTemp)
    }
  }

  // Display forecast weather.
  async function forecast(column) {
  
    // Get the weather settings.
    const weatherSettings = settings.weather

    // Requirements: weather and sunrise
    if (!data.weather) { await setupWeather() }
    if (!data.sun) { await setupSunrise() }

    let startIndex = weatherSettings.showToday ? 1 : 2
    let endIndex = parseInt(weatherSettings.showDays) + startIndex
    if (endIndex > 9) { endIndex = 9 }

    for (var i=startIndex; i < endIndex; i++) {
      // Set up the today weather stack.
      let weatherStack = column.addStack()
      weatherStack.layoutVertically()
      weatherStack.setPadding(0, 0, 0, 0)
      weatherStack.url = "https://weather.com/" + locale +"weather/tenday/l/" + data.location.latitude + "," + data.location.longitude

      // Set up the date formatter and set its locale.
      let df = new DateFormatter()
      df.locale = locale

      // Set up the sub condition stack.
      let subConditionStack = align(weatherStack)
      var myDate = new Date();
      myDate.setDate(currentDate.getDate() + (i - 1));
      df.dateFormat = weatherSettings.showDaysFormat
      
      let dateStack = subConditionStack.addStack()
      dateStack.layoutHorizontally()
      dateStack.setPadding(0, 0, 0, 0)
      
      let dateText = provideText(df.string(myDate), dateStack, textFormat.smallTemp)
      dateText.lineLimit = 1
      dateText.minimumScaleFactor = 0.5
      dateStack.addSpacer()
      let fontSize = (textFormat.smallTemp && textFormat.smallTemp.size) ? textFormat.smallTemp.size : textFormat.defaultText.size
      dateStack.size = new Size(fontSize*2.64,0)
      subConditionStack.addSpacer(5)
      subConditionStack.layoutHorizontally()
      subConditionStack.centerAlignContent()
      subConditionStack.setPadding(0, padding, padding, padding)

      let subCondition = subConditionStack.addImage(provideConditionSymbol(data.weather.forecast[i - 1].Condition, false))
      subCondition.imageSize = new Size(18, 18)
      tintIcon(subCondition, textFormat.smallTemp)
      subConditionStack.addSpacer(5)

      let tempLine = subConditionStack.addImage(drawVerticalLine(new Color((textFormat.tinyTemp && textFormat.tinyTemp.color) ? textFormat.tinyTemp.color : textFormat.defaultText.color, 0.5), 20))
      tempLine.imageSize = new Size(3,28)
      subConditionStack.addSpacer(5)
      let tempStack = subConditionStack.addStack()
      tempStack.layoutVertically()

      const tempHighText = displayNumber(data.weather.forecast[i - 1].High,"-")
      const tempHigh = provideText(tempHighText, tempStack, textFormat.tinyTemp)
      tempStack.addSpacer(4)
      const tempLowText = displayNumber(data.weather.forecast[i - 1].Low,"-")
      const tempLow = provideText(tempLowText, tempStack, textFormat.tinyTemp)
    }
  }

  // Add a battery element to the widget.
  async function battery(column) {
  
    // Set up the battery level item.
    const batteryStack = align(column)
    batteryStack.layoutHorizontally()
    batteryStack.centerAlignContent()
    batteryStack.setPadding(padding/2, padding, padding/2, padding)

    // Set up the battery icon.
    const batteryIcon = batteryStack.addImage(provideBatteryIcon())
    batteryIcon.imageSize = new Size(30,30)
    
    // Change the battery icon to red if battery level is less than 20%.
    const batteryLevel = Math.round(Device.batteryLevel() * 100)
    if (batteryLevel > 20 || Device.isCharging() ) {
      batteryIcon.tintColor = new Color((textFormat.battery && textFormat.battery.color) ? textFormat.battery.color : textFormat.defaultText.color)
    } else {
      batteryIcon.tintColor = Color.red()
    }
    
    // Format the rest of the item.
    batteryStack.addSpacer(padding * 0.6)
    provideText(batteryLevel + "%", batteryStack, textFormat.battery)
  }

  // Show the sunrise or sunset time.
  async function sunrise(column, showSunset = false) {
  
    // Requirements: sunrise
    if (!data.sun) { await setupSunrise() }
  
    const sunrise = data.sun.sunrise
    const sunset = data.sun.sunset
    const tomorrow = data.sun.tomorrow
    const current = currentDate.getTime()
  
    const showWithin = parseInt(settings.sunrise.showWithin)
    const closeToSunrise = closeTo(sunrise) <= showWithin
    const closeToSunset = closeTo(sunset) <= showWithin

    // If we only show sometimes and we're not close, return.
    if (showWithin > 0 && !closeToSunrise && !closeToSunset) { return }
  
    // Otherwise, determine which time to show.
    let timeToShow, symbolName
    const halfHour = 30 * 60 * 1000
    
    // Determine logic for when to show sunset for a combined element.
    const combinedSunset = current > sunrise + halfHour && current < sunset + halfHour

    // Determine if we should show the sunset.
    if (settings.sunrise.separateElements ? showSunset : combinedSunset) {
      symbolName = "sunset.fill"
      timeToShow = sunset
    }
  
    // Otherwise, show a sunrise.
    else {
      symbolName = "sunrise.fill"
      timeToShow = current > sunset ? tomorrow : sunrise
    }
  
    // Set up the stack.
    const sunriseStack = align(column)
    sunriseStack.setPadding(padding/2, padding, padding/2, padding)
    sunriseStack.layoutHorizontally()
    sunriseStack.centerAlignContent()
  
    sunriseStack.addSpacer(padding * 0.3)
  
    // Add the correct symbol.
    const symbol = sunriseStack.addImage(SFSymbol.named(symbolName).image)
    symbol.imageSize = new Size(22,22)
    tintIcon(symbol, textFormat.sunrise)
  
    sunriseStack.addSpacer(padding)
  
    // Add the time.
    const timeText = formatTime(new Date(timeToShow))
    const time = provideText(timeText, sunriseStack, textFormat.sunrise)
  }

  // Allow for either term to be used.
  async function sunset(column) {
    return await sunrise(column, true)
  }
  
  // Return a text-creation function.
  function text(input = null) {

    function displayText(column) {
  
      // Don't do anything if the input is blank.
      if (!input || input == "") { return }
  
      // Otherwise, add the text.
      const textStack = align(column)
      textStack.setPadding(padding, padding, padding, padding)
      const textDisplay = provideText(input, textStack, textFormat.customText)
    }
    return displayText
  }
  
  // Display COVID info on the widget.
  async function covid(column) {

    if (!data.covid) { await setupCovid() }
  
    // Set up the stack.
    const covidStack = align(column)
    covidStack.setPadding(padding/2, padding, padding/2, padding)
    covidStack.layoutHorizontally()
    covidStack.centerAlignContent()
    covidStack.url = settings.covid.url
  
    covidStack.addSpacer(padding * 0.3)
  
    // Add the correct symbol.
    const symbol = covidStack.addImage(SFSymbol.named("bandage").image)
    symbol.imageSize = new Size(18,18)
    symbol.tintColor = new Color((textFormat.covid && textFormat.covid.color) ? textFormat.covid.color : textFormat.defaultText.color)

    covidStack.addSpacer(padding)
  
    // Add the COVID information.
    const covidText = localizedText.covid.replace(/{(.*?)}/g, (match, $1) => {
      let val = data.covid[$1]
      if (val) val = new Intl.NumberFormat(locale.replace('_','-')).format(val)
      return val || ""
    });
    provideText(covidText, covidStack, textFormat.covid)
  
  }

  // Display Weeknumber for current Date
  async function week(column) {
    
    // Set up the Stack.
    const weekStack = align(column)
    weekStack.setPadding(padding/2, padding, 0, padding)
    weekStack.layoutHorizontally()
    weekStack.centerAlignContent()

    // Add the Week Information.
    var currentThursday = new Date(currentDate.getTime() +(3-((currentDate.getDay()+6) % 7)) * 86400000);
    var yearOfThursday = currentThursday.getFullYear();
    var firstThursday = new Date(new Date(yearOfThursday,0,4).getTime() +(3-((new Date(yearOfThursday,0,4).getDay()+6) % 7)) * 86400000);
    var weekNumber = Math.floor(1 + 0.5 + (currentThursday.getTime() - firstThursday.getTime()) / 86400000/7) + "";
    var weekText = localizedText.week + " " + weekNumber;
    provideText(weekText, weekStack, textFormat.week)
  }
  
  /*
   * HELPER FUNCTIONS
   * These functions perform duties for other functions.
   * ===================================================
   */
   
  // Returns a rounded number string or the provided dummy text.
  function displayNumber(number,dummy = "-") {
    return (number == null ? dummy : Math.round(number).toString())
  }

  // Tints icons if needed.
  function tintIcon(icon,format) {
    if (!tintIcons) { return }
    icon.tintColor = new Color((format && format.color) ? format.color : textFormat.defaultText.color)
  }

  // Determines if the provided date is at night.
  function isNight(dateInput) {
    const timeValue = dateInput.getTime()
    return (timeValue < data.sun.sunrise) || (timeValue > data.sun.sunset)
  }

  // Determines if two dates occur on the same day
  function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
  }

  // Returns the number of minutes between now and the provided date.
  function closeTo(time) {
    return Math.abs(currentDate.getTime() - time) / 60000
  }

  // Format the time for a Date input.
  function formatTime(date) {
    let df = new DateFormatter()
    df.locale = locale
    df.useNoDateStyle()
    df.useShortTimeStyle()
    return df.string(date)
  }

  // Provide a text symbol with the specified shape.
  function provideTextSymbol(shape) {

    // Rectangle character.
    if (shape.startsWith("rect")) {
      return "\u2759"
    }
    // Circle character.
    if (shape == "circle") {
      return "\u2B24"
    }
    // Default to the rectangle.
    return "\u2759" 
  }

  // Provide a battery SFSymbol with accurate level drawn on top of it.
  function provideBatteryIcon() {
  
    // If we're charging, show the charging icon.
    if (Device.isCharging()) { return SFSymbol.named("battery.100.bolt").image }
  
    // Set the size of the battery icon.
    const batteryWidth = 87
    const batteryHeight = 41
  
    // Start our draw context.
    let draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(batteryWidth, batteryHeight)
  
    // Draw the battery.
    draw.drawImageInRect(SFSymbol.named("battery.0").image, new Rect(0, 0, batteryWidth, batteryHeight))
  
    // Match the battery level values to the SFSymbol.
    const x = batteryWidth*0.1525
    const y = batteryHeight*0.247
    const width = batteryWidth*0.602
    const height = batteryHeight*0.505
  
    // Prevent unreadable icons.
    let level = Device.batteryLevel()
    if (level < 0.05) { level = 0.05 }
  
    // Determine the width and radius of the battery level.
    const current = width * level
    let radius = height/6.5
  
    // When it gets low, adjust the radius to match.
    if (current < (radius * 2)) { radius = current / 2 }

    // Make the path for the battery level.
    let barPath = new Path()
    barPath.addRoundedRect(new Rect(x, y, current, height), radius, radius)
    draw.addPath(barPath)
    draw.setFillColor(Color.black())
    draw.fillPath()
    return draw.getImage()
  }

  // Provide a symbol based on the condition.
  function provideConditionSymbol(cond,night) {
  
    // Define our symbol equivalencies.
    let symbols = {
    
      // Error
      "1": function() { return "exclamationmark.circle" },
  
      // Thunderstorm
      "2": function() { return "cloud.bolt.rain.fill" },
    
      // Drizzle
      "3": function() { return "cloud.drizzle.fill" },
    
      // Rain
      "5": function() { return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill" },
    
      // Snow
      "6": function() { return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow" },
    
      // Atmosphere
      "7": function() {
        if (cond == 781) { return "tornado" }
        if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
        return night ? "cloud.fog.fill" : "sun.haze.fill"
      },
    
      // Clear and clouds
      "8": function() {
        if (cond == 800 || cond == 801) { return night ? "moon.stars.fill" : "sun.max.fill" }
        if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
        return "cloud.fill"
      }
    }
  
    // Find out the first digit.
    let conditionDigit = Math.floor(cond / 100)
  
    // Get the symbol.
    return SFSymbol.named(symbols[conditionDigit]()).image
  }

  // Provide a font based on the input.
  function provideFont(fontName, fontSize) {
    const fontGenerator = {
      "ultralight": function() { return Font.ultraLightSystemFont(fontSize) },
      "light": function() { return Font.lightSystemFont(fontSize) },
      "regular": function() { return Font.regularSystemFont(fontSize) },
      "medium": function() { return Font.mediumSystemFont(fontSize) },
      "semibold": function() { return Font.semiboldSystemFont(fontSize) },
      "bold": function() { return Font.boldSystemFont(fontSize) },
      "heavy": function() { return Font.heavySystemFont(fontSize) },
      "black": function() { return Font.blackSystemFont(fontSize) },
      "italic": function() { return Font.italicSystemFont(fontSize) }
    }
  
    const systemFont = fontGenerator[fontName]
    if (systemFont) { return systemFont() }
    return new Font(fontName, fontSize)
  }
 
  // Add formatted text to a container.
  function provideText(string, container, format) {
    const textItem = container.addText(string)
    const textFont = (format && format.font) ? format.font : textFormat.defaultText.font
    const textSize = (format && format.size) ? format.size : textFormat.defaultText.size
    const textColor = (format && format.color) ? format.color : textFormat.defaultText.color
  
    textItem.font = provideFont(textFont, parseInt(textSize))
    textItem.textColor = new Color(textColor)
    return textItem
  }

  /*
   * DRAWING FUNCTIONS
   * These functions draw onto a canvas.
   * ===================================
   */

  // Draw the vertical line in the tomorrow view.
  function drawVerticalLine(color, height) {
  
    const width = 2
  
    let draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(width,height)
  
    let barPath = new Path()
    const barHeight = height
    barPath.addRoundedRect(new Rect(0, 0, width, height), width/2, width/2)
    draw.addPath(barPath)
    draw.setFillColor(color)
    draw.fillPath()
  
    return draw.getImage()
  }

  // Draw the temp bar.
  function drawTempBar() {

    // Set the size of the temp bar.
    const tempBarWidth = 200
    const tempBarHeight = 20
  
    // Calculate the current percentage of the high-low range.
    let percent = (data.weather.currentTemp - data.weather.todayLow) / (data.weather.todayHigh - data.weather.todayLow)

    // If we're out of bounds, clip it.
    if (percent < 0) {
      percent = 0
    } else if (percent > 1) {
      percent = 1
    }

    // Determine the scaled x-value for the current temp.
    const currPosition = (tempBarWidth - tempBarHeight) * percent

    // Start our draw context.
    let draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(tempBarWidth, tempBarHeight)

    // Make the path for the bar.
    let barPath = new Path()
    const barHeight = tempBarHeight - 10
    barPath.addRoundedRect(new Rect(0, 5, tempBarWidth, barHeight), barHeight / 2, barHeight / 2)
    draw.addPath(barPath)
  
    // Determine the color.
    const barColor = (textFormat.tinyTemp && textFormat.tinyTemp.color) ? textFormat.tinyTemp.color : textFormat.defaultText.color
    draw.setFillColor(new Color(barColor, 0.5))
    draw.fillPath()

    // Make the path for the current temp indicator.
    let currPath = new Path()
    currPath.addEllipse(new Rect(currPosition, 0, tempBarHeight, tempBarHeight))
    draw.addPath(currPath)
    draw.setFillColor(new Color(barColor, 1))
    draw.fillPath()

    return draw.getImage()
  }
}
