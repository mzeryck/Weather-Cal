// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: calendar;

/*

This script contains the logic that allows Weather Cal to work. Please do not modify this file. You can add customizations in the widget script.
Documentation is available at github.com/mzeryck/Weather-Cal

*/

const weatherCal = {

  // Initialize shared properties.
  initialize(name, iCloudInUse) {
    this.name = name
    this.fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
    this.bgPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-" + this.name)
    this.prefPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-preferences-" + name)
    this.widgetUrl = "https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal.js"
    this.now = new Date()
    this.initialized = true
  },

  // Determine what to do when Weather Cal is run.
  async runSetup(name, iCloudInUse, codeFilename, gitHubUrl) {
    if (!this.initialized) this.initialize(name, iCloudInUse)
    const backgroundSettingExists = this.fm.fileExists(this.bgPath)

    if (!this.fm.fileExists(this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-setup"))) return await this.initialSetup(backgroundSettingExists)
    if (backgroundSettingExists) return await this.editSettings(codeFilename, gitHubUrl)
    await this.generateAlert("Weather Cal is set up, but you need to choose a background for this widget.",["Continue"])
    return await this.setWidgetBackground() 
  },

  // Run the initial setup.
  async initialSetup(imported = false) {
    let message, options
    if (!imported) {
      message = "Welcome to Weather Cal. Make sure your script has the name you want before you begin."
      options = ['I like the name "' + this.name + '"', "Let me go change it"]
      if (await this.generateAlert(message,options)) return
    }

    message = (imported ? "Welcome to Weather Cal. We" : "Next, we") + " need to check if you've given permissions to the Scriptable app. This might take a few seconds."
    await this.generateAlert(message,["Check permissions"])

    let errors = []
    if (!(await this.setupLocation())) { errors.push("location") }
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
    if (await this.generateAlert(message,options)) return

    message = "To display the weather on your widget, you need an OpenWeather API key."
    options = ["I already have a key", "I need to get a key", "I don't want to show weather info"]
    const weather = await this.generateAlert(message,options)

    // Show a web view to claim the API key.
    if (weather == 1) {
      message = "On the next screen, sign up for OpenWeather. Find the API key, copy it, and close the web view. You will then be prompted to paste in the key."
      await this.generateAlert(message,["Continue"])

      const webView = new WebView()
      webView.loadURL("https://openweathermap.org/home/sign_up")
      await webView.present()
    }

    // We need the API key if we're showing weather.
    if (weather < 2 && !(await this.getWeatherKey(true))) { return }

    if (!imported) { await this.setWidgetBackground() }
    this.writePreference("weather-cal-setup", "true")

    message = "Your widget is ready! You'll now see a preview. Re-run this script to edit the default preferences, including localization. When you're ready, add a Scriptable widget to the home screen and select this script."
    await this.generateAlert(message,["Show preview"])
    return this.previewValue()
  },

  // Edit the widget settings.
  async editSettings(codeFilename, gitHubUrl) {
    const menu = { 
      preview: "Show widget preview", 
      background: "Change background", 
      preferences: "Edit preferences", 
      update: "Update code", 
      share: "Export widget", 
      other: "Other settings", 
      exit: "Exit settings menu", 
    }
    const menuOptions = [menu.preview, menu.background, menu.preferences, menu.update, menu.share, menu.other, menu.exit]
    const response = menuOptions[await this.generateAlert("Widget Setup",menuOptions)]

    if (response == menu.preview) { return this.previewValue() } 
    if (response == menu.background) { return await this.setWidgetBackground() }
    if (response == menu.preferences) { return await this.editPreferences() }

    if (response == menu.update) {
      if (await this.generateAlert("Would you like to update the Weather Cal code? Your widgets will not be affected.",["Update", "Exit"])) return
      const success = await this.downloadCode(codeFilename, gitHubUrl)
      return await this.generateAlert(success ? "The update is now complete." : "The update failed. Please try again later.")
    }

    if (response == menu.share) {
      const layout = this.fm.readString(this.fm.joinPath(this.fm.documentsDirectory(), this.name + ".js")).split('`')[1]
      const prefs = JSON.stringify(this.getSettings())
      const bg = this.fm.readString(this.bgPath)
      
      const widgetExport = `async function importWidget() {
      function makeAlert(message,options = ["OK"]) {
        const a = new Alert()
        a.message = message
        for (const option of options) { a.addAction(option) }
        return a
      }
      let fm = FileManager.local()
      fm = fm.isFileStoredIniCloud(module.filename) ? FileManager.iCloud() : fm
      const path = fm.joinPath(fm.documentsDirectory(), "Weather Cal code.js")
      const wc = fm.fileExists(path) ? fm.readString(path) : false
      const version = wc ? parseInt(wc.slice(wc.lastIndexOf("//") + 2).trim()) : false
      if (wc && (!version || version < 4)) { return await makeAlert("Please update Weather Cal before importing a widget.").present() }
      if ((await makeAlert("Do you want your widget to be named " + Script.name() + "?",["Yes, looks good","No, let me change it"]).present()) == 1) { return }
      fm.writeString(fm.joinPath(fm.libraryDirectory(), "weather-cal-preferences-" + Script.name()), '${prefs}')
      fm.writeString(fm.joinPath(fm.libraryDirectory(), "weather-cal-" + Script.name()), '${bg}')
      let code = await new Request('${this.widgetUrl}').loadString()
      let arr = code.split('\`')
      arr[1] = \`${layout}\`
      alert = makeAlert("Close this script and re-run it to finish setup.")
      fm.writeString(module.filename, arr.join('\`'))
      await alert.present()
      }
      await importWidget()
      Script.complete()`
      
      const shouldUseQuickLook = await this.generateAlert("Your export is ready.",["Save to Files", "Display as text to copy"])
      if (shouldUseQuickLook) {
        QuickLook.present('/*\n\n\n\nTap the Share icon in the top right.\nThen tap "Copy" to copy all of this code.\nNow you can paste into a new script.\n\n\n\n*/\n' + widgetExport)
      } else {
        DocumentPicker.exportString(widgetExport, this.name + " export.js")
      }
      return
    }

    if (response == menu.other) {
      const otherOptions = ["Re-enter API key", "Completely reset widget", "Exit"]
      const otherResponse = await this.generateAlert("Other settings",otherOptions)
    
      // Set the API key.
      if (otherResponse == 0) { await this.getWeatherKey() }

      // Reset the widget.
      else if (otherResponse == 1) {
        const alert = new Alert()
        alert.message = "Are you sure you want to completely reset this widget?"
        alert.addDestructiveAction("Reset")
        alert.addAction("Cancel")

        if ((await alert.present()) == 0) {
          if (this.fm.fileExists(this.bgPath)) { this.fm.remove(this.bgPath) }
          if (this.fm.fileExists(this.prefPath)) { this.fm.remove(this.prefPath) }
          const success = await this.downloadCode(this.name, this.widgetUrl)
          const message = success ? "This script has been reset. Close the script and reopen it for the change to take effect." : "The reset failed."
          await this.generateAlert(message)
        }
      }
    }
    return
  },

  // Get the weather key, optionally determining if it's the first run.
  async getWeatherKey(firstRun = false) {
    const returnVal = await this.promptForText("Paste your API key in the box below.",[""],["82c29fdbgd6aebbb595d402f8a65fabf"])
    const apiKey = returnVal.textFieldValue(0)
    if (!apiKey || apiKey == "" || apiKey == null) { return await this.generateAlert("No API key was entered. Try copying the key again and re-running this script.",["Exit"]) }

    this.writePreference("weather-cal-api-key", apiKey)
    const req = new Request("https://api.openweathermap.org/data/2.5/onecall?lat=37.332280&lon=-122.010980&appid=" + apiKey)
    try { val = await req.loadJSON() } catch { val = { current: false } }

    if (!val.current) {
      const message = firstRun ? "New OpenWeather API keys may take a few hours to activate. Your widget will start displaying weather information once it's active." : "The key you entered, " + apiKey + ", didn't work. If it's a new key, it may take a few hours to activate."
      await this.generateAlert(message,[firstRun ? "Continue" : "OK"])

    } else if (val.current && !firstRun) {
      await this.generateAlert("The new key worked and was saved.")
    }
    return true
  },

  // Set the background of the widget.
  async setWidgetBackground() {
    const options = ["Solid color", "Automatic gradient", "Custom gradient", "Image from Photos"]
    const backgroundType = await this.generateAlert("What type of background would you like for your widget?",options)

    const background = {}
    if (backgroundType == 0) {
      background.type = "color"
      const returnVal = await this.promptForText("Enter the hex value of the background color you want.",[""],["#007030"])
      background.color = returnVal.textFieldValue(0)

    } else if (backgroundType == 1) {
      background.type = "auto"

    } else if (backgroundType == 2) {
      background.type = "gradient"
      const returnVal = await this.promptForText("Enter the hex values of the gradient colors.",["",""],["#000000","#ffffff"])
      background.initialColor = returnVal.textFieldValue(0)
      background.finalColor = returnVal.textFieldValue(1)

    } else if (backgroundType == 3) {
      background.type = "image"

      const directoryPath = this.fm.joinPath(this.fm.documentsDirectory(), "Weather Cal")
      if (!this.fm.fileExists(directoryPath) || !this.fm.isDirectory(directoryPath)) { this.fm.createDirectory(directoryPath) }
      
      // If the "dupe" already exists, it's not a dupe.
      const dupePath = this.fm.joinPath(directoryPath, this.name + " 2.jpg")
      const dupeAlreadyExists = this.fm.fileExists(dupePath)

      this.fm.writeImage(this.fm.joinPath(directoryPath, this.name + ".jpg"), await Photos.fromLibrary())

      if (!dupeAlreadyExists && this.fm.fileExists(dupePath)) {
        return await this.generateAlert("Weather Cal detected a duplicate image. Please open the Files app, navigate to Scriptable > Weather Cal, and make sure the file named " + this.name + ".jpg is correct.")
      }
    }

    this.writePreference(null, background, this.bgPath)
    return this.previewValue() 
  },

  // Load or reload a table full of preferences.
  async loadTable(table,category,settingsObject) {
    table.removeAllRows()
    for (settingName in category) {
      if (settingName == "name") continue

      const row = new UITableRow()
      row.dismissOnSelect = false
      row.height = 55

      const setting = category[settingName]

      let valText = setting.val + ""
      if (typeof setting.val == "object") {
        valText = null
        for (subItem in setting.val) {
          const setupText = subItem + ": " + setting.val[subItem]
          valText = (valText ? valText + ", " : "") + setupText
        }
      }

      const cell = row.addText(setting.name,valText)
      cell.subtitleColor = Color.gray()

      // If there's no type, it's just text.
      if (!setting.type) {
        row.onSelect = async () => {
          const returnVal = await this.promptForText(setting.name,[setting.val],[],setting.description)
          setting.val = returnVal.textFieldValue(0)
          await this.loadTable(table,category,settingsObject)
        }

      } else if (setting.type == "enum") {
        row.onSelect = async () => {
          const returnVal = await this.generateAlert(setting.name,setting.options,setting.description)
          setting.val = setting.options[returnVal]
          await this.loadTable(table,category,settingsObject)
        }

      } else if (setting.type == "bool") {
        row.onSelect = async () => {
          const returnVal = await this.generateAlert(setting.name,["true","false"],setting.description)
          setting.val = !returnVal
          await this.loadTable(table,category,settingsObject)
        }

      } else if (setting.type == "multival") {
        row.onSelect = async () => {

          // We need an ordered set.
          const map = new Map(Object.entries(setting.val))
          const keys = Array.from(map.keys())
          const returnVal = await this.promptForText(setting.name,Array.from(map.values()),keys,setting.description)
          for (let i=0; i < keys.length; i++) {
            setting.val[keys[i]] = returnVal.textFieldValue(i)
          }
          await this.loadTable(table,category,settingsObject)
        }
      }
      table.addRow(row)
    }
    table.reload()
  },
  
  // Get the current settings for the widget or for editing.
  getSettings(forEditing = false) {
    let settingsFromFile  
    if (this.fm.fileExists(this.prefPath)) { settingsFromFile = JSON.parse(this.fm.readString(this.prefPath)) }

    const settingsObject = this.defaultSettings()
    for (category in settingsObject) {
      for (item in settingsObject[category]) {

        // If the setting exists, use it. Otherwise, the default is used.
        let value = (settingsFromFile && settingsFromFile[category]) ? settingsFromFile[category][item] : undefined
        if (value == undefined) { value = settingsObject[category][item].val }
        
        // Format the object correctly depending on where it will be used.
        if (forEditing) { settingsObject[category][item].val = value }
        else { settingsObject[category][item] = value }
      }
    }
    return settingsObject
  },

  // Edit preferences of the widget.
  async editPreferences() {
    const settingsObject = this.getSettings(true)
    const table = new UITable()
    table.showSeparators = true

    for (categoryKey in settingsObject) {
      const row = new UITableRow()
      row.dismissOnSelect = false

      const category = settingsObject[categoryKey]
      row.addText(category.name)
      row.onSelect = async () => {
        const subTable = new UITable()
        subTable.showSeparators = true
        await this.loadTable(subTable,category,settingsObject)
        await subTable.present()
      }
      table.addRow(row)
    }
    await table.present()

    for (categoryKey in settingsObject) {
      for (item in settingsObject[categoryKey]) {
        if (item == "name") continue
        settingsObject[categoryKey][item] = settingsObject[categoryKey][item].val
      }
    }
    this.writePreference(null, settingsObject, this.prefPath)
  },

  // Return the size of the widget preview.
  previewValue() {
    if (this.fm.fileExists(this.prefPath)) {
      const settingsObject = JSON.parse(this.fm.readString(this.prefPath))
      return settingsObject.widget.preview
    } else { return "large" }
  },

  // Download a Scriptable script.
  async downloadCode(filename, url) {
    try {
      const codeString = await new Request(url).loadString()
      if (codeString.indexOf("// Variables used by Scriptable.") < 0) {
        return false
      } else {
        this.fm.writeString(this.fm.joinPath(this.fm.documentsDirectory(), filename + ".js"), codeString)
        return true
      }
    } catch {
      return false
    }
  },

  // Generate an alert with the provided array of options.
  async generateAlert(title,options = ["OK"],message = null) {
    const alert = new Alert()
    alert.title = title
    if (message) alert.message = message

    for (const option of options) { alert.addAction(option) }
    return await alert.presentAlert()
  },

  // Prompt for one or more text field values.
  async promptForText(title,values,keys,message = null) {
    const alert = new Alert()
    alert.title = title
    if (message) alert.message = message

    for (i=0; i < values.length; i++) { alert.addTextField(keys && keys[i] ? keys[i] : null,values[i] + "") }
    alert.addAction("OK")
    await alert.present()
    return alert
  },

  // Write the value of a preference to disk.
  writePreference(name, value, inputPath = null) {
    this.fm.writeString(inputPath || this.fm.joinPath(this.fm.libraryDirectory(), name), JSON.stringify(value))
  },
  
/* 
 * Widget spacing, background, and construction
 * -------------------------------------------- */

  // Create and return the widget.
  async createWidget(layout, name, iCloudInUse, custom) {
    if (!this.initialized) this.initialize(name, iCloudInUse)

    // Determine if we're using the old or new setup.
    if (typeof layout == "object") {
      this.settings = layout

    } else {
      this.settings = this.getSettings()
      this.settings.layout = layout
    }
    
    // Shared values.
    this.locale = this.settings.widget.locale
    this.padding = parseInt(this.settings.widget.padding)
    this.tintIcons = this.settings.widget.tintIcons
    this.localization = this.settings.localization
    this.format = this.settings.font
    this.data = {}
    this.custom = custom

    if (!this.locale || this.locale == "" || this.locale == null) { this.locale = Device.locale() }
    
    // Widget setup.
    this.widget = new ListWidget()
    this.widget.spacing = 0

    const verticalPad = this.padding < 10 ? 10 - this.padding : 10
    const horizontalPad = this.padding < 15 ? 15 - this.padding : 15

    const widgetPad = this.settings.widget.widgetPadding || {}
    const topPad    = (widgetPad.top && widgetPad.top.length) ? parseInt(widgetPad.top) : verticalPad
    const leftPad   = (widgetPad.left && widgetPad.left.length) ? parseInt(widgetPad.left) : horizontalPad
    const bottomPad = (widgetPad.bottom && widgetPad.bottom.length) ? parseInt(widgetPad.bottom) : verticalPad
    const rightPad  = (widgetPad.right && widgetPad.right.length) ? parseInt(widgetPad.right) : horizontalPad
    
    this.widget.setPadding(topPad, leftPad, bottomPad, rightPad)

    // Background setup.
    const background = JSON.parse(this.fm.readString(this.bgPath))

    if (custom && custom.background) {
      await custom.background(this.widget)

    } else if (background.type == "color") {
      this.widget.backgroundColor = new Color(background.color)

    } else if (background.type == "auto") {
      const gradient = new LinearGradient()
      const gradientSettings = await this.setupGradient()

      gradient.colors = gradientSettings.color()
      gradient.locations = gradientSettings.position()
      this.widget.backgroundGradient = gradient

    } else if (background.type == "gradient") {
      const gradient = new LinearGradient()

      gradient.colors = [new Color(background.initialColor), new Color(background.finalColor)]
      gradient.locations = [0, 1]
      this.widget.backgroundGradient = gradient

    } else if (background.type == "image") {
      const imagePath = this.fm.joinPath(this.fm.joinPath(this.fm.documentsDirectory(), "Weather Cal"), name + ".jpg")

      if (this.fm.fileExists(imagePath)) {
        await this.fm.downloadFileFromiCloud(imagePath)
        this.widget.backgroundImage = this.fm.readImage(imagePath)

      } else if (config.runsInWidget) {
        this.widget.backgroundColor = Color.gray() 

      } else {
        const img = await Photos.fromLibrary()
        this.widget.backgroundImage = img
        this.fm.writeImage(imagePath, img)
      }
    }

    // Construct the widget.
    this.currentRow = {}
    this.currentColumn = {}
    this.left()

    this.usingASCII = undefined
    this.currentColumns = []
    this.rowNeedsSetup = false

    for (rawLine of this.settings.layout.split(/\r?\n/)) { 
      const line = rawLine.trim()
      if (line == '') { continue }
      if (this.usingASCII == undefined) { 
        if (line.includes("row")) { this.usingASCII = false }
        if (line[0] == "-" && line[line.length-1] == "-") { this.usingASCII = true }
      }
      this.usingASCII ? await this.processASCIILine(line) : await this.executeItem(line)
    }
    return this.widget
  },

  // Execute an item in the layout generator.
  async executeItem(item) {
    const itemArray = item.replace(/[.,]$/,"").split('(')
    const functionName = itemArray[0]
    const parameter = itemArray[1] ? itemArray[1].slice(0, -1) : null

    if (this.custom && this.custom[functionName]) { return await this.custom[functionName](this.currentColumn, parameter) }
    if (this[functionName]) { return await this[functionName](this.currentColumn, parameter) }
    console.error("The " + functionName + " item in your layout is unavailable. Check for misspellings or other formatting issues. If you have any custom items, ensure they are set up correctly.")
  },

  // Processes a single line of ASCII. 
  async processASCIILine(line) {

    // If it's a line, enumerate previous columns (if any) and set up the new row.
    if (line[0] == "-" && line[line.length-1] == "-") {
      if (this.currentColumns.length > 0) { 
        for (col of this.currentColumns) {
          if (!col) { continue }
          this.column(this.currentColumn,col.width)
          for (item of col.items) { await this.executeItem(item) }
        }
        this.currentColumns = []
      }
      return this.rowNeedsSetup = true
    }

    if (this.rowNeedsSetup) { 
      this.row(this.currentColumn)
      this.rowNeedsSetup = false 
    }

    const items = line.split('|')
    for (var i=1; i < items.length-1; i++) {

      if (!this.currentColumns[i]) { this.currentColumns[i] = { items: [] } }
      const column = this.currentColumns[i].items

      const rawItem = items[i]
      const trimmedItem = rawItem.trim().split("(")[0]

      // If it's not a widget item, it's a column width or a space.
      if (!(this[trimmedItem] || (this.custom && this.custom[trimmedItem]))) { 

        if (rawItem.match(/\s+\d+\s+/)) {
          const value = parseInt(trimmedItem)
          if (value) { this.currentColumns[i].width = value }
          continue
        }

        const prevItem = column[column.length-1]
        if (trimmedItem == "" && (!prevItem || !prevItem.startsWith("space"))) {
          column.push("space")
          continue
        }
      }

      const leading = rawItem.startsWith(" ")
      const trailing = rawItem.endsWith(" ")
      column.push((leading && trailing) ? "center" : (trailing ? "left" : "right"))
      column.push(rawItem.trim())
    }
  },

  // Makes a new row on the widget.
  row(input, parameter) {
    this.currentRow = this.widget.addStack()
    this.currentRow.layoutHorizontally()
    this.currentRow.setPadding(0, 0, 0, 0)
    this.currentColumn.spacing = 0
    if (parameter) this.currentRow.size = new Size(0,parseInt(parameter))
  },

  // Makes a new column on the widget.
  column(input, parameter) {
    this.currentColumn = this.currentRow.addStack()
    this.currentColumn.layoutVertically()
    this.currentColumn.setPadding(0, 0, 0, 0)
    this.currentColumn.spacing = 0
    if (parameter) this.currentColumn.size = new Size(parseInt(parameter),0)
  },

  // Adds a space, with an optional amount.
  space(input, parameter) { 
    if (parameter) input.addSpacer(parseInt(parameter))
    else input.addSpacer()
  },

  // Create an aligned stack to add content to.
  align(column) {
    const alignmentStack = column.addStack()
    alignmentStack.layoutHorizontally()

    const returnStack = this.currentAlignment(alignmentStack)
    returnStack.layoutVertically()
    return returnStack
  },
  
  // Set the current alignment.
  setAlignment(left = false, right = false) {
    function alignment(alignmentStack) {
      if (right) alignmentStack.addSpacer()
      const returnStack = alignmentStack.addStack()
      if (left) alignmentStack.addSpacer()
      return returnStack
    }
    this.currentAlignment = alignment
  },

  // Change the current alignment to right, left, or center.
  right() { this.setAlignment(false, true) },
  left() { this.setAlignment(true, false) },
  center() { this.setAlignment(true, true) },
  
/* 
 * Data setup functions
 * -------------------------------------------- */

  // Set up the event data object.
  async setupEvents() {
    const eventSettings = this.settings.events

    let calSetting = eventSettings.selectCalendars
    let calendars = []
    if (Array.isArray(calSetting)) {
      calendars = calSetting
    } else if (typeof calSetting == "string") {
      calSetting = calSetting.trim()
      calendars = calSetting.length > 0 ? calSetting.split(",") : []
    }

    let numberOfDays = parseInt(eventSettings.numberOfDays)
    numberOfDays = isNaN(numberOfDays) ? 1 : numberOfDays
    
    // Complex due to support for old boolean values.
    let showFutureAt = parseInt(eventSettings.showTomorrow)
    showFutureAt = isNaN(showFutureAt) ? (eventSettings.showTomorrow ? 0 : 24) : showFutureAt

    const events = await CalendarEvent.thisWeek([])
    const nextWeek = await CalendarEvent.nextWeek([])
    events.push(...nextWeek)

    this.data.events = events.filter((event) => {

      const diff = this.dateDiff(this.now, event.startDate)
      if (diff < 0 || diff > numberOfDays) { return false }
      if (diff > 0 && this.now.getHours() < showFutureAt) { return false }

      if (calendars.length && !calendars.includes(event.calendar.title)) { return false }
      if (event.title.startsWith("Canceled:")) { return false }
      if (event.isAllDay) { return eventSettings.showAllDay }

      const minutesAfter = parseInt(eventSettings.minutesAfter) * 60000 || 0
      return (event.startDate.getTime() + minutesAfter > this.now.getTime())

    }).slice(0,parseInt(eventSettings.numberOfEvents))
  },

  // Set up the reminders data object.
  async setupReminders() {
    const reminderSettings = this.settings.reminders

    let listSetting = reminderSettings.selectLists
    let lists = []
    if (Array.isArray(listSetting)) {
      lists = listSetting
    } else if (typeof listSetting == "string") {
      listSetting = listSetting.trim()
      lists = listSetting.length > 0 ? listSetting.split(",") : []
    }

    const reminders = await Reminder.allIncomplete()
    reminders.sort(function(a, b) {

      // Non-null due dates are prioritized.
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

    this.data.reminders = reminders.filter((reminder) => {
      if (lists.length && !lists.includes(reminder.calendar.title)) { return false }
      if (!reminder.dueDate)  { return reminderSettings.showWithoutDueDate }
      if (reminder.isOverdue) { return reminderSettings.showOverdue }
      if (reminderSettings.todayOnly) { return this.dateDiff(reminder.dueDate, this.now) == 0 }
      return true
    }).slice(0,parseInt(reminderSettings.numberOfReminders))
  },

  // Set up the gradient for the widget background.
  async setupGradient() {
    if (!this.data.sun) { await this.setupSunrise() }
    
    if (this.isNight(this.now)) {
      return {
        color() { return [new Color("16296b"), new Color("021033"), new Color("021033"), new Color("113245")] },
        position() { return [-0.5, 0.2, 0.5, 1] },
      }
    }
    return {
      color() { return [new Color("3a8cc1"), new Color("90c0df")] },
      position() { return [0, 1] },
    }
  },

  // Set up the location data object.
  async setupLocation() {
    const locationPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-location")
    const locationCache = this.getCache(locationPath, this.settings ? parseInt(this.settings.updateLocation) : null)
    let location
    
    if (!locationCache || locationCache.cacheExpired) {
      try { location = await Location.current() }
      catch { location = locationCache || {} }

      try {
        const geocode = await Location.reverseGeocode(location.latitude, location.longitude, this.locale)
        location.locality = (geocode[0].locality || geocode[0].postalAddress.city) || geocode[0].administrativeArea
      } catch {
        location.locality = locationCache ? locationCache.locality : null
      }
      if (location && location.locality) this.fm.writeString(locationPath, JSON.stringify(location))
    }
    this.data.location = location || locationCache
    if (!this.data.location.latitude) return false
    return true
  },

  // Set up the sun data object.
  async setupSunrise() {
    if (!this.data.location) { await this.setupLocation() }
    const location = this.data.location
    async function getSunData(date) { return await new Request("https://api.sunrise-sunset.org/json?lat=" + location.latitude + "&lng=" + location.longitude + "&formatted=0&date=" + date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()).loadJSON() }

    const sunPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-sunrise")
    let sunData = this.getCache(sunPath, 60, 1440)

    if (!sunData || sunData.cacheExpired || !sunData.results || sunData.results.length == 0) { 
      try {
        sunData = await getSunData(this.now)

        const tomorrowDate = new Date()
        tomorrowDate.setDate(this.now.getDate() + 1)
        const tomorrowData = await getSunData(tomorrowDate)
        sunData.results.tomorrow = tomorrowData.results.sunrise

        this.fm.writeString(sunPath, JSON.stringify(sunData))
      } catch {}
    }
    this.data.sun = {}
    this.data.sun.sunrise = sunData ? new Date(sunData.results.sunrise).getTime() : null
    this.data.sun.sunset = sunData ? new Date(sunData.results.sunset).getTime() : null
    this.data.sun.tomorrow = sunData ? new Date(sunData.results.tomorrow).getTime() : null
  },

  // Set up the weather data object.
  async setupWeather() {
    if (!this.data.location) { await this.setupLocation() }

    const weatherPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-cache")
    let weatherData = this.getCache(weatherPath, 1, 60)
    
    function getLocale(locale) {
      const openWeatherLang = ["af","al","ar","az","bg","ca","cz","da","de","el","en","eu","fa","fi","fr","gl","he","hi","hr","hu","id","it","ja","kr","la","lt","mk","no","nl","pl","pt","pt_br","ro","ru","sv","se","sk","sl","sp","es","sr","th","tr","ua","uk","vi","zh_cn","zh_tw","zu"]
      const languages = [locale, locale.split("_")[0], Device.locale(), Device.locale().split("_")[0]]
      for (item of languages) { if (openWeatherLang.includes(item)) return item }
    }

    if (!weatherData || weatherData.cacheExpired) {
      try {
        const apiKey = this.fm.readString(this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-api-key"))
        const weatherReq = "https://api.openweathermap.org/data/2.5/onecall?lat=" + this.data.location.latitude + "&lon=" + this.data.location.longitude + "&exclude=minutely,alerts&units=" + this.settings.widget.units + "&lang=" + getLocale(this.locale) + "&appid=" + apiKey
        weatherData = await new Request(weatherReq).loadJSON()
        if (weatherData.cod) { weatherData = null }
        if (weatherData) { this.fm.writeString(weatherPath, JSON.stringify(weatherData)) }
      } catch {}
    }

    // English continues using the "main" weather description.
    const english = (this.locale.split("_")[0] == "en")

    this.data.weather = {}
    this.data.weather.currentTemp = weatherData ? weatherData.current.temp : null
    this.data.weather.currentCondition = weatherData ? weatherData.current.weather[0].id : 100
    this.data.weather.currentDescription = weatherData ? (english ? weatherData.current.weather[0].main : weatherData.current.weather[0].description) : "--"
    this.data.weather.todayHigh = weatherData ? weatherData.daily[0].temp.max : null
    this.data.weather.todayLow = weatherData ? weatherData.daily[0].temp.min : null

    this.data.weather.forecast = []
    this.data.weather.hourly = []
    for (let i=0; i <= 7; i++) {
      this.data.weather.forecast[i] = weatherData ? ({High: weatherData.daily[i].temp.max, Low: weatherData.daily[i].temp.min, Condition: weatherData.daily[i].weather[0].id}) : { High: null, Low: null, Condition: 100 }
      this.data.weather.hourly[i] = weatherData ? ({Temp: weatherData.hourly[i].temp, Condition: weatherData.hourly[i].weather[0].id}) : { Temp: null, Condition: 100 }
    }

    this.data.weather.tomorrowRain = weatherData ? weatherData.daily[1].pop * 100 : null
    this.data.weather.nextHourRain = weatherData ? weatherData.hourly[1].pop * 100 : null
  },

  // Set up the COVID data object.
  async setupCovid() {
    const covidPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-covid")
    let covidData = this.getCache(covidPath, 15, 1440)

    if (!covidData || covidData.cacheExpired) {
      try {
        covidData = await new Request("https://coronavirus-19-api.herokuapp.com/countries/" + this.settings.covid.country.trim()).loadJSON()
        this.fm.writeString(covidPath, JSON.stringify(covidData))
      } catch {}
    }
    this.data.covid = covidData || {}
  },
  
  // Set up the news.
  async setupNews() {
    const newsPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-news")
    let newsData = this.getCache(newsPath, 1, 1440)

    if (!newsData || newsData.cacheExpired) {
      try {
        let rawData = await new Request(this.settings.news.url).loadString()
        rawData = getTag(rawData, "item", parseInt(this.settings.news.numberOfItems))
        if (!rawData || rawData.length == 0) { throw 0 }
        
        newsData = []
        for (item of rawData) {
          const listing = {}
          listing.title = scrubString(getTag(item, "title")[0])
          listing.link = getTag(item, "link")[0]
          listing.date = new Date(getTag(item, "pubDate")[0])
          newsData.push(listing)
        }
        this.fm.writeString(newsPath, JSON.stringify(newsData))
      } catch {}
    }
    this.data.news = newsData || []
    
    // Get one or many tags from a string.
    function getTag(string, tag, number = 1) {
      const open = "<" + tag + ">"
      const close = "</" + tag + ">"
      let returnVal = []
      let data = string
  
      for (i = 0; i < number; i++) {
        const closeIndex = data.indexOf(close)
        if (closeIndex < 0) break
        returnVal.push(data.slice(data.indexOf(open)+open.length, closeIndex))
        data = data.slice(closeIndex + close.length)
      }
      return returnVal
    }
    
    // Scrub a string so it's readable.
    function scrubString(val) {
      return val.replace(/^<!\[CDATA\[/,"").replace(/\]\]>$/,"").replace(/&#(.+?);/g,function(match,p1) {
        return String.fromCodePoint(p1)
      })
    }
  },
  
/* 
 * Widget items
 * -------------------------------------------- */

  // Display the date on the widget.
  async date(column) {
    const dateSettings = this.settings.date
    if (!this.data.events && dateSettings.dynamicDateSize) { await this.setupEvents() }

    if (dateSettings.dynamicDateSize ? this.data.events.length : dateSettings.staticDateSize == "small") {
      this.provideText(this.formatDate(this.now,dateSettings.smallDateFormat), column, this.format.smallDate, true)

    } else {
      const dateOneStack = this.align(column)
      const dateOne = this.provideText(this.formatDate(this.now,dateSettings.largeDateLineOne), dateOneStack, this.format.largeDate1)
      dateOneStack.setPadding(this.padding/2, this.padding, 0, this.padding)

      const dateTwoStack = this.align(column)
      const dateTwo = this.provideText(this.formatDate(this.now,dateSettings.largeDateLineTwo), dateTwoStack, this.format.largeDate2)
      dateTwoStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  },

  // Display a time-based greeting on the widget.
  greeting(column) {

    // This function makes a greeting based on the time of day.
    function makeGreeting(hour, localization) {
      if (hour    < 5)  { return localization.nightGreeting }
      if (hour    < 12) { return localization.morningGreeting }
      if (hour-12 < 5)  { return localization.afternoonGreeting }
      if (hour-12 < 10) { return localization.eveningGreeting }
      return localization.nightGreeting
    }
    this.provideText(makeGreeting(this.now.getHours(), this.localization), column, this.format.greeting, true)
  },

  // Display events on the widget.
  async events(column) {
    if (!this.data.events) { await this.setupEvents() }
    const eventSettings = this.settings.events

    if (this.data.events.length == 0) { 
      if (eventSettings.noEventBehavior == "message" && this.localization.noEventMessage.length) { return this.provideText(this.localization.noEventMessage, column, this.format.noEvents, true) }
      if (this[eventSettings.noEventBehavior]) { return await this[eventSettings.noEventBehavior](column) }
    }

    let currentStack
    let currentDiff = 0
    const numberOfEvents = this.data.events.length
    const settingUrlExists = (eventSettings.url || "").length > 0
    const showCalendarColor = eventSettings.showCalendarColor
    const colorShape = showCalendarColor.includes("circle") ? "circle" : "rectangle"
    
    // Creates an event stack on the widget for a specific date diff.
    function makeEventStack(diff, currentDate) {
      const eventStack = column.addStack()
      eventStack.layoutVertically()
      eventStack.setPadding(0, 0, 0, 0)
      const secondsForDay = Math.floor(currentDate.getTime() / 1000) - 978307200 + (diff * 86400)
      eventStack.url = settingUrlExists ? eventSettings.url : "calshow:" + secondsForDay
      currentStack = eventStack
    }
    
    makeEventStack(currentDiff,this.now)

    for (let i = 0; i < numberOfEvents; i++) {
      const event = this.data.events[i]
      const diff = this.dateDiff(this.now, event.startDate)

      if (diff != currentDiff) {
        currentDiff = diff
        makeEventStack(currentDiff,this.now)

        const tomorrowText = this.localization.tomorrowLabel
        const eventLabelText = (diff == 1 && tomorrowText.length) ? tomorrowText : this.formatDate(event.startDate,eventSettings.labelFormat)
        this.provideText(eventLabelText.toUpperCase(), currentStack, this.format.eventLabel, true)
      }
      
      // Setting up the title row.
      const titleStack = this.align(currentStack)
      titleStack.layoutHorizontally()

      if (showCalendarColor.length && showCalendarColor != "none" && !showCalendarColor.includes("right")) {
        const colorItemText = this.provideTextSymbol(colorShape) + " "
        const colorItem = this.provideText(colorItemText, titleStack, this.format.eventTitle)
        colorItem.textColor = event.calendar.color
      }

      const showLocation = eventSettings.showLocation && event.location
      const showTime = !event.isAllDay

      const title = this.provideText(event.title.trim(), titleStack, this.format.eventTitle)
      const titlePadding = (showLocation || showTime) ? this.padding/5 : this.padding
      titleStack.setPadding(this.padding, this.padding, titlePadding, this.padding)
      if (this.data.events.length >= 3) { title.lineLimit = 1 } // TODO: Make setting for this

      if (showCalendarColor.length && showCalendarColor != "none" && showCalendarColor.includes("right")) {
        const colorItemText = " " + this.provideTextSymbol(colorShape)
        const colorItem = this.provideText(colorItemText, titleStack, this.format.eventTitle)
        colorItem.textColor = event.calendar.color
      }
      
      // Setting up the location row.
      if (showLocation) {
        const locationStack = this.align(currentStack)
        const location = this.provideText(event.location, locationStack, this.format.eventLocation)
        location.lineLimit = 1
        locationStack.setPadding(0, this.padding, showTime ? this.padding/5 : this.padding, this.padding)
      }

      if (event.isAllDay) { continue }
      
      // Setting up the time row.
      let timeText = this.formatTime(event.startDate)
      if (eventSettings.showEventLength == "time") { 
        timeText += "–" + this.formatTime(event.endDate) 

      } else if (eventSettings.showEventLength == "duration") {
        const duration = (event.endDate.getTime() - event.startDate.getTime()) / (1000*60)
        const hours = Math.floor(duration/60)
        const minutes = Math.floor(duration % 60)
        const hourText = hours>0 ? hours + this.localization.durationHour : ""
        const minuteText = minutes>0 ? minutes + this.localization.durationMinute : ""
        timeText += " \u2022 " + hourText + (hourText.length && minuteText.length ? " " : "") + minuteText
      }

      const timeStack = this.align(currentStack)
      const time = this.provideText(timeText, timeStack, this.format.eventTime)
      timeStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  },

  // Display reminders on the widget.
  async reminders(column) {
    if (!this.data.reminders) { await this.setupReminders() }
    const reminderSettings = this.settings.reminders

    if (this.data.reminders.length == 0) {
      if (reminderSettings.noRemindersBehavior == "message" && this.localization.noRemindersMessage.length) { return this.provideText(this.localization.noRemindersMessage, messageStack, this.format.noReminders, true) }
      if (this[reminderSettings.noRemindersBehavior]) { return await this[reminderSettings.noRemindersBehavior](column) }
    }

    const reminderStack = column.addStack()
    reminderStack.layoutVertically()
    reminderStack.setPadding(0, 0, 0, 0)
    const settingUrl = reminderSettings.url || ""
    reminderStack.url = (settingUrl.length > 0) ? settingUrl : "x-apple-reminderkit://REMCDReminder/"

    const numberOfReminders = this.data.reminders.length
    const showListColor = reminderSettings.showListColor
    const colorShape = showListColor.includes("circle") ? "circle" : "rectangle"

    for (let i = 0; i < numberOfReminders; i++) {
      const reminder = this.data.reminders[i]

      const titleStack = this.align(reminderStack)
      titleStack.layoutHorizontally()

      // TODO: Functionize for events and reminders
      if (showListColor.length && showListColor != "none" && !showListColor.includes("right")) {
        let colorItemText = this.provideTextSymbol(colorShape) + " "
        let colorItem = this.provideText(colorItemText, titleStack, this.format.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }

      const title = this.provideText(reminder.title.trim(), titleStack, this.format.reminderTitle)
      titleStack.setPadding(this.padding, this.padding, this.padding/5, this.padding)

      if (showListColor.length && showListColor != "none" && showListColor.includes("right")) {
        let colorItemText = " " + this.provideTextSymbol(colorShape)
        let colorItem = this.provideText(colorItemText, titleStack, this.format.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }

      if (reminder.isOverdue) { title.textColor = Color.red() }
      if (reminder.isOverdue || !reminder.dueDate) { continue }

      let timeText
      if (reminderSettings.useRelativeDueDate) {
        const rdf = new RelativeDateTimeFormatter()
        rdf.locale = this.locale
        rdf.useNamedDateTimeStyle()
        timeText = rdf.string(reminder.dueDate, this.now)

      } else {
        const df = new DateFormatter()
        df.locale = this.locale

        if (this.dateDiff(reminder.dueDate, this.now) == 0 && reminder.dueDateIncludesTime) { df.useNoDateStyle() }
        else { df.useShortDateStyle() }

        if (reminder.dueDateIncludesTime) { df.useShortTimeStyle() }
        else { df.useNoTimeStyle() }

        timeText = df.string(reminder.dueDate)
      }

      const timeStack = this.align(reminderStack)
      const time = this.provideText(timeText, timeStack, this.format.eventTime)
      timeStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  },

  // Display the current weather.
  async current(column) {
    if (!this.data.weather) { await this.setupWeather() }
    if (!this.data.sun) { await this.setupSunrise() }

    const [locationData, weatherData, sunData] = [this.data.location, this.data.weather, this.data.sun]
    const weatherSettings = this.settings.weather
    
    // Setting up the current weather stack.
    const currentWeatherStack = column.addStack()
    currentWeatherStack.layoutVertically()
    currentWeatherStack.setPadding(0, 0, 0, 0)

    const defaultUrl = "https://weather.com/" + this.locale + "/weather/today/l/" + locationData.latitude + "," + locationData.longitude
    const settingUrl = weatherSettings.urlCurrent || ""
    if (settingUrl.trim() != "none") { currentWeatherStack.url = (settingUrl.length > 0) ? settingUrl : defaultUrl }
    
    // Displaying the main conditions.
    if (weatherSettings.showLocation) { this.provideText(locationData.locality, currentWeatherStack, this.format.smallTemp, true) }

    const mainConditionStack = this.align(currentWeatherStack)
    const mainCondition = mainConditionStack.addImage(this.provideConditionSymbol(weatherData.currentCondition,this.isNight(this.now)))
    mainCondition.imageSize = new Size(22,22) // TODO: Adjustable size
    this.tintIcon(mainCondition, this.format.largeTemp)
    mainConditionStack.setPadding(weatherSettings.showLocation ? 0 : this.padding, this.padding, 0, this.padding)
    
    const tempText = this.displayNumber(weatherData.currentTemp,"--") + "°"
    if (weatherSettings.horizontalCondition) {
      mainConditionStack.addSpacer(5)
      mainConditionStack.layoutHorizontally()
      mainConditionStack.centerAlignContent()
      this.provideText(tempText, mainConditionStack, this.format.largeTemp)
    }

    if (weatherSettings.showCondition) {
      const conditionTextStack = this.align(currentWeatherStack)
      this.provideText(weatherData.currentDescription, conditionTextStack, this.format.smallTemp)
      conditionTextStack.setPadding(this.padding, this.padding, 0, this.padding)
    }

    if (!weatherSettings.horizontalCondition) {
      const tempStack = this.align(currentWeatherStack)
      tempStack.setPadding(0, this.padding, 0, this.padding)
      this.provideText(tempText, tempStack, this.format.largeTemp)
    }

    if (!weatherSettings.showHighLow) { return }
    
    // Setting up the temp bar.
    const tempBarStack = this.align(currentWeatherStack)
    tempBarStack.layoutVertically()
    tempBarStack.setPadding(0, this.padding, this.padding, this.padding)
    tempBarStack.size = new Size(60,30)

    const tempBar = tempBarStack.addImage(this.provideTempBar())
    tempBar.size = new Size(50,0)

    tempBarStack.addSpacer(1)

    const highLowStack = tempBarStack.addStack()
    highLowStack.layoutHorizontally()
    this.provideText(this.displayNumber(weatherData.todayLow,"-"), highLowStack, this.format.tinyTemp)
    highLowStack.addSpacer()
    this.provideText(this.displayNumber(weatherData.todayHigh,"-"), highLowStack, this.format.tinyTemp)
  },

  // Display upcoming weather.
  async future(column) {
    if (!this.data.weather) { await this.setupWeather() }
    if (!this.data.sun) { await this.setupSunrise() }

    const [locationData, weatherData, sunData] = [this.data.location, this.data.weather, this.data.sun]
    const weatherSettings = this.settings.weather

    const futureWeatherStack = column.addStack()
    futureWeatherStack.layoutVertically()
    futureWeatherStack.setPadding(0, 0, 0, 0)

    const showNextHour = (this.now.getHours() < parseInt(weatherSettings.tomorrowShownAtHour))

    const defaultUrl = "https://weather.com/" + this.locale + "/weather/" + (showNextHour ? "today" : "tenday") +"/l/" + locationData.latitude + "," + locationData.longitude
    const settingUrl = showNextHour ? (weatherSettings.urlFuture || "") : (weatherSettings.urlForecast || "")
    if (settingUrl != "none") { futureWeatherStack.url = (settingUrl.length > 0) ? settingUrl : defaultUrl }

    const subLabelStack = this.align(futureWeatherStack)
    const subLabelText = showNextHour ? this.localization.nextHourLabel : this.localization.tomorrowLabel
    const subLabel = this.provideText(subLabelText, subLabelStack, this.format.smallTemp)
    subLabelStack.setPadding(0, this.padding, this.padding/2, this.padding)

    const subConditionStack = this.align(futureWeatherStack)
    subConditionStack.layoutHorizontally()
    subConditionStack.centerAlignContent()
    subConditionStack.setPadding(0, this.padding, this.padding, this.padding)

    let nightCondition = false
    if (showNextHour) { nightCondition = this.isNight(new Date(this.now.getTime() + (60*60*1000))) }

    const subCondition = subConditionStack.addImage(this.provideConditionSymbol(showNextHour ? weatherData.hourly[1].Condition : weatherData.forecast[1].Condition,nightCondition))
    const subConditionSize = showNextHour ? 14 : 18
    subCondition.imageSize = new Size(subConditionSize, subConditionSize)
    this.tintIcon(subCondition, this.format.smallTemp)
    subConditionStack.addSpacer(5)

    if (showNextHour) {
      this.provideText(this.displayNumber(weatherData.hourly[1].Temp,"--") + "°", subConditionStack, this.format.smallTemp)

    } else {
      const tomorrowLine = subConditionStack.addImage(this.drawVerticalLine(new Color((this.format.tinyTemp && this.format.tinyTemp.color) ? this.format.tinyTemp.color : this.format.defaultText.color, 0.5), 20))
      tomorrowLine.imageSize = new Size(3,28)
      subConditionStack.addSpacer(5)
      const tomorrowStack = subConditionStack.addStack()
      tomorrowStack.layoutVertically()

      this.provideText(this.displayNumber(weatherData.forecast[1].High,"-"), tomorrowStack, this.format.tinyTemp)
      tomorrowStack.addSpacer(4)
      this.provideText(this.displayNumber(weatherData.forecast[1].Low,"-"), tomorrowStack, this.format.tinyTemp)
    }

    if (weatherSettings.showRain) {
      const subRainStack = this.align(futureWeatherStack)
      subRainStack.layoutHorizontally()
      subRainStack.centerAlignContent()
      subRainStack.setPadding(0, this.padding, this.padding, this.padding)

      const subRain = subRainStack.addImage(SFSymbol.named("umbrella").image)
      subRain.imageSize = new Size(subConditionSize, subConditionSize)
      this.tintIcon(subRain, this.format.smallTemp, true)
      subRainStack.addSpacer(5)

      this.provideText(this.displayNumber(showNextHour ? weatherData.nextHourRain : weatherData.tomorrowRain,"--") + "%", subRainStack, this.format.smallTemp)
    }
  },

  // Display forecast weather.
  async forecast(column, hourly = false) {
    if (!this.data.weather) { await this.setupWeather() }
    if (!this.data.sun) { await this.setupSunrise() }
    const [locationData, weatherData, sunData, weatherSettings] = [this.data.location, this.data.weather, this.data.sun, this.settings.weather]

    // Set up the container stack and overall spacing.
    const weatherStack = this.align(column)
    const defaultUrl = "https://weather.com/" + this.locale + "/weather/" + (hourly ? "today" : "tenday") + "/l/" + locationData.latitude + "," + locationData.longitude
    const settingUrl = hourly ? (weatherSettings.urlFuture || "") : (weatherSettings.urlForecast || "")
    weatherStack.url = (settingUrl.length > 0) ? settingUrl : defaultUrl
    
    const horizontal = hourly ? weatherSettings.horizontalHours : weatherSettings.horizontalForecast
    const spacing = (weatherSettings.spacing ? parseInt(weatherSettings.spacing) : 0) + (horizontal ? 0 : 5)
    const outsidePadding = this.padding > spacing ? this.padding - spacing : 0

    if (horizontal) { 
      weatherStack.layoutHorizontally()
      weatherStack.setPadding(this.padding, outsidePadding, this.padding, outsidePadding)
    } else {
      weatherStack.layoutVertically()
      weatherStack.setPadding(outsidePadding, this.padding, outsidePadding, this.padding)
    }
    
    let startIndex = hourly ? 1 : (weatherSettings.showToday ? 1 : 2)
    let endIndex = (hourly ? parseInt(weatherSettings.showHours) : parseInt(weatherSettings.showDays)) + startIndex
    if (endIndex > 9) { endIndex = 9 }

    const myDate = new Date()
    if (!hourly && startIndex == 1) { myDate.setDate(myDate.getDate() - 1) }
    const dateFormat = hourly ? weatherSettings.showHoursFormat : weatherSettings.showDaysFormat
    
    // Loop through each individual unit.
    const edgePadding = this.padding > spacing ? spacing : this.padding
    const smallFontSize = (this.format.smallTemp && this.format.smallTemp.size) ? this.format.smallTemp.size : this.format.defaultText.size
    const stackSize = hourly ? new Size(smallFontSize*3,0) : new Size(smallFontSize*2.64,0)

    for (var i=startIndex; i < endIndex; i++) {
      if (hourly) { myDate.setHours(myDate.getHours() + 1) }
      else { myDate.setDate(myDate.getDate() + 1) }

      const unitStack = weatherStack.addStack()
      const dateStack = unitStack.addStack()
      const initialSpace = (i == startIndex) ? edgePadding : spacing
      const finalSpace = (i == endIndex-1) ? edgePadding : spacing

      if (horizontal) {
        unitStack.setPadding(0, initialSpace, 0, finalSpace)
        unitStack.layoutVertically()
        
        dateStack.addSpacer()
        this.provideText(this.formatDate(myDate,dateFormat), dateStack, this.format.smallTemp)
        dateStack.addSpacer()
        
      } else {
        unitStack.setPadding(initialSpace, 0, finalSpace, 0)
        unitStack.layoutHorizontally()
        
        dateStack.layoutHorizontally()
        dateStack.setPadding(0, 0, 0, 0)
        dateStack.size = stackSize
        
        const dateText = this.provideText(this.formatDate(myDate,dateFormat), dateStack, this.format.smallTemp)
        dateText.lineLimit = 1
        dateText.minimumScaleFactor = 0.5
        dateStack.addSpacer()
      }
      
      unitStack.centerAlignContent()
      unitStack.addSpacer(5)
      
      const conditionStack = unitStack.addStack()
      conditionStack.centerAlignContent()
      conditionStack.layoutHorizontally()
      if (horizontal) { conditionStack.addSpacer() }
      
      // Set up the container for the condition.
      if (hourly) {
        const subCondition = conditionStack.addImage(this.provideConditionSymbol(weatherData.hourly[i - 1].Condition, this.isNight(myDate)))
        subCondition.imageSize = new Size(18,18)
        this.tintIcon(subCondition, this.format.smallTemp)
        
        if (horizontal) { conditionStack.addSpacer() }
        unitStack.addSpacer(5)
        
        const tempStack = unitStack.addStack()
        tempStack.centerAlignContent()
        tempStack.layoutHorizontally()
        
        if (horizontal) { tempStack.addSpacer() }
        const temp = this.provideText(this.displayNumber(weatherData.hourly[i - 1].Temp,"--") + "°", tempStack, this.format.smallTemp)
        temp.lineLimit = 1
        temp.minimumScaleFactor = 0.75
        if (horizontal) { 
          temp.size = stackSize
          tempStack.addSpacer() 
        }
        
      } else { 
        const tinyFontSize = (this.format.tinyTemp && this.format.tinyTemp.size) ? this.format.tinyTemp.size : this.format.defaultText.size
        conditionStack.size = new Size(0,tinyFontSize*2.64)
      
        const conditionIcon = conditionStack.addImage(this.provideConditionSymbol(weatherData.forecast[i - 1].Condition, false))
        conditionIcon.imageSize = new Size(18,18)
        this.tintIcon(conditionIcon, this.format.smallTemp)
        conditionStack.addSpacer(5)

        const tempLine = conditionStack.addImage(this.drawVerticalLine(new Color((this.format.tinyTemp && this.format.tinyTemp.color) ? this.format.tinyTemp.color : this.format.defaultText.color, 0.5), 20))
        tempLine.imageSize = new Size(3,28)
        conditionStack.addSpacer(5)

        let tempStack = conditionStack.addStack()
        tempStack.layoutVertically()
        tempStack.size = hourly ? new Size(smallFontSize*1,0) : new Size(smallFontSize*1,0)

        const tempHigh = this.provideText(this.displayNumber(weatherData.forecast[i - 1].High,"-"), tempStack, this.format.tinyTemp)
        tempHigh.lineLimit = 1
        tempHigh.minimumScaleFactor = 0.6
        tempStack.addSpacer(4)
        const tempLow = this.provideText(this.displayNumber(weatherData.forecast[i - 1].Low,"-"), tempStack, this.format.tinyTemp)
        tempLow.lineLimit = 1
        tempLow.minimumScaleFactor = 0.6
      
        if (horizontal) { conditionStack.addSpacer() }
      }
    }
  },
  
  // Allow both terms to be used.
  async daily(column) { await this.forecast(column) },
  
  // Display an hourly forecast.
  async hourly(column) { await this.forecast(column, true) },

  // Show the sunrise or sunset time.
  async sunrise(column, forceSunset = false) {
    if (!this.data.sun) { await this.setupSunrise() }
    const [sunrise, sunset, tomorrow, current, sunSettings] = [this.data.sun.sunrise, this.data.sun.sunset, this.data.sun.tomorrow, this.now.getTime(), this.settings.sunrise]

    const showWithin = parseInt(sunSettings.showWithin)
    if (showWithin > 0 && !(Math.abs(this.now.getTime() - sunrise) / 60000 <= showWithin) && !(Math.abs(this.now.getTime() - sunset) / 60000 <= showWithin)) { return }

    let timeToShow, symbolName
    const showSunset = current > sunrise + 30*60*1000 && current < sunset + 30*60*1000

    if (sunSettings.separateElements ? forceSunset : showSunset) {
      symbolName = "sunset.fill"
      timeToShow = sunset
    } else {
      symbolName = "sunrise.fill"
      timeToShow = current > sunset ? tomorrow : sunrise
    }

    const sunriseStack = this.align(column)
    sunriseStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)
    sunriseStack.layoutHorizontally()
    sunriseStack.centerAlignContent()

    sunriseStack.addSpacer(this.padding * 0.3)

    const sunSymbol = sunriseStack.addImage(SFSymbol.named(symbolName).image)
    sunSymbol.imageSize = new Size(22,22)
    this.tintIcon(sunSymbol, this.format.sunrise) // TODO: Maybe function-ize this too?

    sunriseStack.addSpacer(this.padding)

    const time = this.provideText(timeToShow == null ? "--" : this.formatTime(new Date(timeToShow)), sunriseStack, this.format.sunrise)
  },

  // Allow for either term to be used.
  async sunset(column) { return await this.sunrise(column, true) },
  
  // Display COVID info on the widget.
  async covid(column) {
    if (!this.data.covid) { await this.setupCovid() }

    const covidStack = this.align(column)
    covidStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)
    covidStack.layoutHorizontally()
    covidStack.centerAlignContent()
    covidStack.url = this.settings.covid.url

    covidStack.addSpacer(this.padding * 0.3)

    const covidIcon = covidStack.addImage(SFSymbol.named("bandage").image)
    covidIcon.imageSize = new Size(18,18)
    this.tintIcon(covidIcon,this.format.covid,true)

    covidStack.addSpacer(this.padding)

    this.provideText(this.localization.covid.replace(/{(.*?)}/g, (match, $1) => {
      let val = this.data.covid[$1]
      if (val) val = new Intl.NumberFormat(this.locale.replace('_','-')).format(val)
      return val || ""
    }), covidStack, this.format.covid)
  },

  // Add custom text to the column.
  text(column, input) {
    if (!input || input == "") { return }
    this.provideText(input, column, this.format.customText, true)
  },
  
  // Add a battery element to the widget.
  battery(column) {
    const batteryStack = this.align(column)
    batteryStack.layoutHorizontally()
    batteryStack.centerAlignContent()
    batteryStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)

    const batteryIcon = batteryStack.addImage(this.provideBatteryIcon(Device.batteryLevel(),Device.isCharging()))
    batteryIcon.imageSize = new Size(30,30)

    const batteryLevel = Math.round(Device.batteryLevel() * 100)
    if (batteryLevel > 20 || Device.isCharging() ) { this.tintIcon(batteryIcon,this.format.battery,true) }
    else { batteryIcon.tintColor = Color.red() }

    batteryStack.addSpacer(this.padding * 0.6)
    this.provideText(batteryLevel + "%", batteryStack, this.format.battery)
  },

  // Display week number for current date.
  week(column) {
    const weekStack = this.align(column)
    weekStack.setPadding(this.padding/2, this.padding, 0, this.padding)
    weekStack.layoutHorizontally()
    weekStack.centerAlignContent()

    const currentThursday = new Date(this.now.getTime() +(3-((this.now.getDay()+6) % 7)) * 86400000)
    const yearOfThursday = currentThursday.getFullYear()
    const firstThursday = new Date(new Date(yearOfThursday,0,4).getTime() +(3-((new Date(yearOfThursday,0,4).getDay()+6) % 7)) * 86400000)
    const weekNumber = Math.floor(1 + 0.5 + (currentThursday.getTime() - firstThursday.getTime()) / 86400000/7) + ""
    this.provideText(this.localization.week + " " + weekNumber, weekStack, this.format.week)
  },
  
  // Display a symbol.
  symbol(column, name) {
    if (!name || !SFSymbol.named(name)) { return }

    const symSettings = this.settings.symbol || {}
    const symbolPad = symSettings.padding || {}
    const topPad    = (symbolPad.top && symbolPad.top.length) ? parseInt(symbolPad.top) : this.padding
    const leftPad   = (symbolPad.left && symbolPad.left.length) ? parseInt(symbolPad.left) : this.padding
    const bottomPad = (symbolPad.bottom && symbolPad.bottom.length) ? parseInt(symbolPad.bottom) : this.padding
    const rightPad  = (symbolPad.right && symbolPad.right.length) ? parseInt(symbolPad.right) : this.padding
    
    const symbolStack = this.align(column)
    symbolStack.setPadding(topPad, leftPad, bottomPad, rightPad)

    const symbol = symbolStack.addImage(SFSymbol.named(name).image)
    const size = symSettings.size.length > 0 ? parseInt(symSettings.size) : column.size.width - (this.padding * 4)
    symbol.imageSize = new Size(size, size)
    if (symSettings.tintColor.length > 0) { symbol.tintColor = new Color(symSettings.tintColor) }
  },
  
  // Show news headlines.
  async news(column) {
    if (!this.data.news) { await this.setupNews() }
    const newsSettings = this.settings.news

    for (newsItem of this.data.news) {
      const newsStack = column.addStack()
      newsStack.setPadding(this.padding, this.padding, this.padding, this.padding)
      newsStack.spacing = this.padding/5
      newsStack.layoutVertically()
      newsStack.url = newsItem.link
      
      const titleStack = this.align(newsStack)
      const title = this.provideText(newsItem.title, titleStack, this.format.newsTitle)
      if (newsSettings.limitLineHeight) title.lineLimit = 1

      if (!newsSettings.showDate) { continue }
      
      const dateStack = this.align(newsStack)
      let dateText
      switch (newsSettings.showDate) {
        case "relative":
          const rdf = new RelativeDateTimeFormatter()
          rdf.locale = this.locale
          rdf.useNamedDateTimeStyle()
          dateText = rdf.string(newsItem.date, this.now)
          break
        case "date":
          dateText = this.formatDate(newsItem.date)
          break
        case "time":
          dateText = dateText = this.formatTime(newsItem.date)
          break
        case "datetime":
          dateText = this.formatDatetime(newsItem.date)
          break
        case "custom":
          dateText = this.formatDate(newsItem.date, newsSettings.dateFormat)
      }
      this.provideText(dateText, dateStack, this.format.newsDate)
    }
  },
  
/* 
 * Helper functions
 * -------------------------------------------- */

  // Gets the cache.
  getCache(path, minAge, maxAge) {
    if (!this.fm.fileExists(path)) return null
    let cache = JSON.parse(this.fm.readString(path))
    const age = (this.now.getTime() - this.fm.modificationDate(path).getTime())/60000
    if (maxAge && age > maxAge) return null
    if (minAge && age > minAge) cache.cacheExpired = true
    return cache
  },

  // Returns a rounded number string or the provided dummy text.
  displayNumber(number,dummy = "-") { return (number == null ? dummy : Math.round(number).toString()) },

  // Tints icons if needed or forced.
  tintIcon(icon,format,force = false) {
    if (!this.tintIcons && !force) { return }
    icon.tintColor = new Color((format && format.color) ? format.color : this.format.defaultText.color)
  },

  // Determines if the provided date is at night.
  isNight(dateInput) {
    const timeValue = dateInput.getTime()
    return (timeValue < this.data.sun.sunrise) || (timeValue > this.data.sun.sunset)
  },
  
  // Returns the difference in days between two dates. Adapted from StackOverflow.
  dateDiff(first, second) {
    const firstDate = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, 0, 0)
    const secondDate = new Date(second.getFullYear(), second.getMonth(), second.getDate(), 0, 0, 0)
    return Math.round((secondDate-firstDate)/(1000*60*60*24))
  },

  // Convenience functions for dates and times.
  formatTime(date) { return this.formatDate(date,null,false,true) },
  formatDatetime(date) { return this.formatDate(date,null,true,true) },
  
  // Format the date. If no format is provided, date-only is used by default.
  formatDate(date,format,showDate = true, showTime = false) {
    const df = new DateFormatter()
    df.locale = this.locale
    if (format) {
      df.dateFormat = format
    } else {
      showDate ? df.useShortDateStyle() : df.useNoDateStyle()
      showTime ? df.useShortTimeStyle() : df.useNoTimeStyle()
    }
    return df.string(date)
  },

  // Provide a text symbol with the specified shape.
  provideTextSymbol(shape) {
    if (shape.startsWith("rect")) { return "\u2759" }
    if (shape == "circle") { return "\u2B24" }
    return "\u2759" 
  },

  // Provide a battery SFSymbol with accurate level drawn on top of it.
  provideBatteryIcon(batteryLevel,charging = false) {
    if (charging) { return SFSymbol.named("battery.100.bolt").image }

    const batteryWidth = 87
    const batteryHeight = 41

    const draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(batteryWidth, batteryHeight)

    draw.drawImageInRect(SFSymbol.named("battery.0").image, new Rect(0, 0, batteryWidth, batteryHeight))

    const x = batteryWidth*0.1525
    const y = batteryHeight*0.247
    const width = batteryWidth*0.602
    const height = batteryHeight*0.505

    let level = batteryLevel
    if (level < 0.05) { level = 0.05 }

    const current = width * level
    let radius = height/6.5

    // When it gets low, adjust the radius to match.
    if (current < (radius * 2)) { radius = current / 2 }

    const barPath = new Path()
    barPath.addRoundedRect(new Rect(x, y, current, height), radius, radius)
    draw.addPath(barPath)
    draw.setFillColor(Color.black())
    draw.fillPath()
    return draw.getImage()
  },

  // Provide a symbol based on the condition.
  provideConditionSymbol(cond,night) {
    const symbols = {
      "1": function() { return "exclamationmark.circle" },
      "2": function() { return "cloud.bolt.rain.fill" },
      "3": function() { return "cloud.drizzle.fill" },
      "5": function() { return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill" },
      "6": function() { return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow" },
      "7": function() {
        if (cond == 781) { return "tornado" }
        if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
        return night ? "cloud.fog.fill" : "sun.haze.fill"
      },
      "8": function() {
        if (cond == 800 || cond == 801) { return night ? "moon.stars.fill" : "sun.max.fill" }
        if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
        return "cloud.fill"
      },
    }
    return SFSymbol.named(symbols[Math.floor(cond / 100)]()).image
  },

  // Provide a font based on the input.
  provideFont(fontName, fontSize) {
    const fontGenerator = {
      ultralight() { return Font.ultraLightSystemFont(fontSize) },
      light()      { return Font.lightSystemFont(fontSize) },
      regular()    { return Font.regularSystemFont(fontSize) },
      medium()     { return Font.mediumSystemFont(fontSize) },
      semibold()   { return Font.semiboldSystemFont(fontSize) },
      bold()       { return Font.boldSystemFont(fontSize) },
      heavy()      { return Font.heavySystemFont(fontSize) },
      black()      { return Font.blackSystemFont(fontSize) },
      italic()     { return Font.italicSystemFont(fontSize) },
    }
    return fontGenerator[fontName] ? fontGenerator[fontName]() : new Font(fontName, fontSize)
  },

  // Add formatted text to a container.
  provideText(string, stack, format, standardize = false) {
    let container = stack
    if (standardize) {
      container = this.align(stack)
      container.setPadding(this.padding, this.padding, this.padding, this.padding)
    }
    const defaultText = this.format.defaultText
    const textItem = container.addText(string)
    const textFont = (format && format.font && format.font.length) ? format.font : defaultText.font
    const textSize = (format && format.size && format.size.length) ? format.size : defaultText.size
    const textColor = (format && format.color && format.color.length) ? format.color : defaultText.color
    textItem.font = this.provideFont(textFont, parseInt(textSize))
    textItem.textColor = new Color(textColor)
    return textItem
  },

  // Draw the vertical line in the tomorrow view. - TODO: delete
  drawVerticalLine(color, height) {

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
  },

  // Provide the temp bar.
  provideTempBar() {

    const tempBarWidth = 200
    const tempBarHeight = 20
    const weatherData = this.data.weather

    let percent = (weatherData.currentTemp - weatherData.todayLow) / (weatherData.todayHigh - weatherData.todayLow)
    if (percent < 0) { percent = 0 } 
    else if (percent > 1) { percent = 1 }

    const draw = new DrawContext()
    draw.opaque = false
    draw.respectScreenScale = true
    draw.size = new Size(tempBarWidth, tempBarHeight)

    const barPath = new Path()
    const barHeight = tempBarHeight - 10
    barPath.addRoundedRect(new Rect(0, 5, tempBarWidth, barHeight), barHeight / 2, barHeight / 2)
    draw.addPath(barPath)

    const barColor = (this.format.tinyTemp && this.format.tinyTemp.color) ? this.format.tinyTemp.color : this.format.defaultText.color
    draw.setFillColor(new Color(barColor, 0.5))
    draw.fillPath()

    const currPath = new Path()
    currPath.addEllipse(new Rect((tempBarWidth - tempBarHeight) * percent, 0, tempBarHeight, tempBarHeight))
    draw.addPath(currPath)
    draw.setFillColor(new Color(barColor, 1))
    draw.fillPath()

    return draw.getImage()
  },
  
  // Return the default widget settings.
  defaultSettings() {
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
          name: "Item padding",
          description: "The padding around each item. This also determines the approximate widget padding. Default is 5.",
        },
        widgetPadding: {
          val: { top: "", left: "", bottom: "", right: "" },
          name: "Custom widget padding",
          type: "multival",
          description: "The padding around the entire widget. By default, these values are blank and Weather Cal uses the item padding to determine these values. Transparent widgets often look best with these values at 0.",
        },
        tintIcons: {
          val: false,
          name: "Icons match text color",
          description: "Decide if icons should match the color of the text around them.",
          type: "bool",
        },
        updateLocation: {
          val: "60",
          name: "Location update frequency",
          description: "How often, in minutes, to update the current location. Set to 0 to never update.",
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
        noRemindersMessage: {
          val: "Tasks complete.",
          name: "No reminders message",
          description: "The message shown when there are no more reminders for the day, if that setting is active.",
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
          val: { size: "14", color: "ffffff", dark: "", font: "regular", caps: "" },
          name: "Default font settings",
          description: "These settings apply to all text on the widget that doesn't have a customized value.",
          type: "multival",
        },
        smallDate:   {
          val: { size: "17", color: "", dark: "", font: "semibold", caps: "" },
          name: "Small date",
          type: "multival",
        },
        largeDate1:  {
          val: { size: "30", color: "", dark: "", font: "light", caps: "" },
          name: "Large date, line 1",
          type: "multival",
        },
        largeDate2:  {
          val: { size: "30", color: "", dark: "", font: "light", caps: "" },
          name: "Large date, line 2",
          type: "multival",
        },
        greeting:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "Greeting",
          type: "multival",
        },
        eventLabel:  {
          val: { size: "14", color: "", dark: "", font: "semibold", caps: "" },
          name: "Event heading (used for the TOMORROW label)",
          type: "multival",
        },
        eventTitle:  {
          val: { size: "14", color: "", dark: "", font: "semibold", caps: "" },
          name: "Event title",
          type: "multival",
        },
        eventLocation:   {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Event location",
          type: "multival",
        },
        eventTime:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "Event time",
          type: "multival",
        },
        noEvents:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "No events message",
          type: "multival",
        },
        reminderTitle:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Reminder title",
          type: "multival",
        },
        reminderTime:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "Reminder time",
          type: "multival",
        },
        noReminders:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "No reminders message",
          type: "multival",
        },
        newsTitle:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "News item title",
          type: "multival",
        },
        newsDate:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "News item date",
          type: "multival",
        },
        largeTemp:   {
          val: { size: "34", color: "", dark: "", font: "light", caps: "" },
          name: "Large temperature label",
          type: "multival",
        },
        smallTemp:   {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Most text used in weather items",
          type: "multival",
        },
        tinyTemp:    {
          val: { size: "12", color: "", dark: "", font: "", caps: "" },
          name: "Small text used in weather items",
          type: "multival",
        },
        customText:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "User-defined text items",
          type: "multival",
        },
        battery:     {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "Battery percentage",
          type: "multival",
        },
        sunrise:     {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "Sunrise and sunset",
          type: "multival",
        },
        covid:       {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "COVID data",
          type: "multival",
        },
        week:        {
          val: { size: "14", color: "", dark: "", font: "light", caps: "" },
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
          name: "Minutes after event begins",
          description: "Number of minutes after an event begins that it should still be shown.",
        }, 
        showAllDay: {
          val: false,
          name: "Show all-day events",
          type: "bool",        
        },
        numberOfDays: {
          val: "1",
          name: "How many future days of events to show",
          description: "How many days to show into the future. Set to 0 to show today's events only. The maximum is 7.",
        }, 
        labelFormat: {
          val: "EEEE, MMMM d",
          name: "Date format for future event days",
        }, 
        showTomorrow: {
          val: "20",
          name: "Future days shown at hour",
          description: "The hour (in 24-hour time) to start showing events for tomorrow or beyond. Use 0 for always, 24 for never.",
        }, 
        showEventLength: {
          val: "duration",
          name: "Event length display style",
          description: "Choose whether to show the duration, the end time, or no length information.",
          type: "enum",
          options: ["duration","time","none"],
        }, 
        showLocation: {
          val: false,
          name: "Show event location",
          type: "bool",        
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
        url: {
          val: "",
          name: "URL to open when tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank to open the built-in Calendar app.",
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
        noRemindersBehavior: {
          val: "none",
          name: "Show when no reminders remain",
          description: "When no reminders remain, show a hard-coded message, a time-based greeting, or nothing.",
          type: "enum",
          options: ["message","greeting","none"],
        }, 
        url: {
          val: "",
          name: "URL to open when tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank to open the built-in Reminders app.",
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
        spacing: {
          val: "0",
          name: "Spacing between daily or hourly forecast items",
        },
        horizontalHours: {
          val: false,
          name: "Display the hourly forecast horizontally",
          type: "bool",
        },
        showHours: {
          val: "3",
          name: "Number of hours shown in the hourly forecast item",
        }, 
        showHoursFormat: {
          val: "ha",
          name: "Date format for the hourly forecast item",
        }, 
        horizontalForecast: {
          val: false,
          name: "Display the daily forecast horizontally",
          type: "bool",
        },
        showDays: {
          val: "3",
          name: "Number of days shown in the daily forecast item",
        }, 
        showDaysFormat: {
          val: "E",
          name: "Date format for the daily forecast item",
        }, 
        showToday: {
          val: false,
          name: "Show today's weather in the daily forecast item",
          type: "bool",
        },
        urlCurrent: {
          val: "",
          name: "URL to open when current weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the default.",
        }, 
        urlFuture: {
          val: "",
          name: "URL to open when hourly weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the default.",
        }, 
        urlForecast: {
          val: "",
          name: "URL to open when daily weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the default.",
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
      symbol: {
        name: "Symbols",
        size: {
          val: "18",
          name: "Size",
          description: "Size of each symbol. Leave blank to fill the width of the column.",
        }, 
        padding: {
          val: { top: "", left: "", bottom: "", right: "" },
          name: "Padding",
          type: "multival",
          description: "The padding around each symbol. Leave blank to use the default padding.",
        },
        tintColor: {
          val: "ffffff",
          name: "Tint color",
          description: "The hex code color value to tint the symbols. Leave blank for the default tint.",
        }, 
      },
      news: {
        name: "News",
        url: {
          val: "http://rss.cnn.com/rss/cnn_topstories.rss",
          name: "RSS feed link",
          description: "The RSS feed link for the news to display."
        }, 
        numberOfItems: {
          val: "1",
          name: "Maximum number of news items shown",
        }, 
        limitLineHeight: {
          val: false,
          name: "Limit the height of each news item",
          description: "Set this to true to limit each headline to a single line.",
          type: "bool",
        },
        showDate: {
          val: "none",
          name: "Display the publish date for each news item",
          description: "Use relative (5 minutes ago), date, time, date and time, a custom format, or none.",
          type: "enum",
          options: ["relative","date","time","datetime","custom","none"],
        }, 
        dateFormat: {
          val: "H:mm",
          name: "Date and/or time format for news items",
          description: 'The format to use if the publish date setting is "formatted".',
        },
      },
    }
    return settings
  },
}

module.exports = weatherCal

/*
 * Detect the current module
 * by Raymond Velasquez @supermamon
 * -------------------------------------------- */
 
const moduleName = module.filename.match(/[^\/]+$/)[0].replace(".js","")
if (moduleName == Script.name()) {
  await (async () => {
    // Comment out the return to run a test.
    return
    const layout = `
    row
      column
    `
    const name = "Weather Cal widget"
    //await weatherCal.runSetup(name, true, "Weather Cal code", "https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal-code.js")
    const w = await weatherCal.createWidget(layout, name, true)
    w.presentLarge()
    Script.complete()
  })() 
}

/* 
 * Don't modify the characters below this line.
 * -------------------------------------------- */
//4
