/*
 * SETUP
 * Use this section to set up the widget.
 * ======================================
 */

// To use weather, get a free API key at openweathermap.org/appid and paste it in between the quotation marks.
const apiKey = ""

// Set the locale code. Leave blank "" to match the device's locale. You can change the hard-coded text strings in the TEXT section below.
let locale = "en"

// Set to true for fixed location, false to update location as you move around
const lockLocation = true

// The size of the widget preview in the app.
const widgetPreview = "large"

// Set to true for an image background, false for no image.
const imageBackground = true

// Set to true to reset the widget's background image.
const forceImageUpdate = false

// Set the padding around each item. Default is 10.
const padding = 10

/*
 * LAYOUT
 * Decide what items to show on the widget.
 * ========================================
 */

// Set the width of the column, or set to 0 for an automatic width.

// You can add items to the column: 
// date, greeting, events, current, future, battery, text("Your text here")
// You can also add a left, center, or right to the list. Everything after it will be aligned that way.

// Make sure to always put a comma after each item.

const columns = [{
  
  // Settings for the left column.
  width: 0,
  items: [
    
    left,
    greeting,
    date,
    events,
    
]}, {

  // Settings for the right column.
  width: 100,
  items: [
    
    left,
    current,
    space,
    future,
  
]}]

/*
 * ITEM SETTINGS
 * Choose how each item is displayed.
 * ==================================
 */  
 
// DATE
// ====
const dateSettings = {

  // If set to true, date will become smaller when events are displayed.
  dynamicDateSize: true

  // If the date is not dynamic, should it be large or small?
  ,staticDateSize: "large"

  // Determine the date format for each date type. See docs.scriptable.app/dateformatter
  ,smallDateFormat: "EEEE, MMMM d"
  ,largeDateLineOne: "EEEE,"
  ,largeDateLineTwo: "MMMM d"
}

// EVENTS
// ======
const eventSettings = {

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
}

// WEATHER
// =======
const weatherSettings = {

  // Set to imperial for Fahrenheit, or metric for Celsius
  units: "imperial"

  // Show today's high and low temperatures.
  ,showHighLow: true

  // Set the hour (in 24-hour time) to switch to tomorrow's weather. Set to 24 to never show it.
  ,tomorrowShownAtHour: 20
}

/*
 * TEXT
 * Change the language and formatting of text displayed.
 * =====================================================
 */  
 
// You can change the language or wording of any text in the widget.
const localizedText = {
  
  // The text shown if you add a greeting item to the layout.
  nightGreeting: "Good night."
  ,morningGreeting: "Good morning."
  ,afternoonGreeting: "Good afternoon."
  ,eveningGreeting: "Good evening."
  
  // The text shown if you add a future weather item to the layout, or tomorrow's events.
  ,nextHourLabel: "Next hour"
  ,tomorrowLabel: "Tomorrow"

  // The text shown in an events item when no events remain.
  // Change to blank "" if you don't want to show a message.
  ,noEventMessage: "Enjoy the rest of your day."
  
  // The text shown after the hours and minutes of an event duration.
  ,durationMinute: "m"
  ,durationHour: "h"
     
}

// Set the font, size, and color of various text elements. Use iosfonts.com to find fonts to use. If you want to use the default iOS font, set the font name to one of the following: ultralight, light, regular, medium, semibold, bold, heavy, black, or italic.
const textFormat = {
  
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
  
  battery:    { size: 18, color: "", font: "medium" }
}

/*
 * WIDGET CODE
 * Be more careful editing this section. 
 * =====================================
 */

// Make sure we have a locale value.
if (locale == "" || locale == null) { locale = Device.locale() }

// Declare the data variables.
var eventData, locationData, sunData, weatherData

// Create global constants.
const currentDate = new Date()
const files = FileManager.local()

/*
 * COLUMNS
 * =======
 */

// Set up the widget and the main stack.
let widget = new ListWidget()
widget.setPadding(0, 0, 0, 0)

let mainStack = widget.addStack()
mainStack.layoutHorizontally()
mainStack.setPadding(0, 0, 0, 0)

// Set up alignment.
var currentAlignment = left

// Set up our columns.
for (var x = 0; x < columns.length; x++) {

  let column = columns[x]
  let columnStack = mainStack.addStack()
  columnStack.layoutVertically()
  
  // Only add padding on the first or last column.
  columnStack.setPadding(0, x == 0 ? padding/2 : 0, 0, x == columns.length-1 ? padding/2 : 0)
  columnStack.size = new Size(column.width,0)
  
  // Add the items to the column.
  for (var i = 0; i < column.items.length; i++) {
    await column.items[i](columnStack)
  }
}

/*
 * BACKGROUND DISPLAY
 * ==================
 */

// If it's an image background, display it.
if (imageBackground) {
  
  // Determine if our image exists and when it was saved.
  const path = files.joinPath(files.documentsDirectory(), "weather-cal-image")
  const exists = files.fileExists(path)
  
  // If it exists and an update isn't forced, use the cache.
  if (exists && (config.runsInWidget || !forceImageUpdate)) {
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
    
// If it's not an image background, show the gradient.
} else {
  let gradient = new LinearGradient()
  let gradientSettings = await setupGradient()
  
  gradient.colors = gradientSettings.color()
  gradient.locations = gradientSettings.position()
  
  widget.backgroundGradient = gradient
}

// Finish the widget and show a preview.
Script.setWidget(widget)
if (widgetPreview == "small") { widget.presentSmall() }
else if (widgetPreview == "medium") { widget.presentMedium() }
else if (widgetPreview == "large") { widget.presentLarge() }
Script.complete()

/*
 * LAYOUT FUNCTIONS
 * These functions manage spacing and alignment.
 * =============================================
 */

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

// Set up the eventData object.
async function setupEvents() {
  
  eventData = {}
  const calendars = eventSettings.selectCalendars
  const numberOfEvents = eventSettings.numberOfEvents

  // Function to determine if an event should be shown.
  function shouldShowEvent(event) {
  
    // If events are filtered and the calendar isn't in the selected calendars, return false.
    if (calendars.length && !calendars.includes(event.calendar.title)) { return false }

    // Hack to remove canceled Office 365 events.
    if (event.title.startsWith("Canceled:")) { return false }

    // If it's an all-day event, only show if the setting is active.
    if (event.isAllDay) { return eventSettings.showAllDay }

    // Otherwise, return the event if it's in the future.
    return (event.startDate.getTime() > currentDate.getTime())
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
  if (eventSettings.showTomorrow && shownEvents < numberOfEvents) {
  
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
  eventData.futureEvents = futureEvents
  eventData.eventsAreVisible = (futureEvents.length > 0) && (eventSettings.numberOfEvents > 0)
}

// Set up the gradient for the widget background.
async function setupGradient() {
  
  // Requirements: sunrise
  if (!sunData) { await setupSunrise() }

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

  const sunrise = sunData.sunrise
  const sunset = sunData.sunset
  const utcTime = currentDate.getTime()

  function closeTo(time,mins) {
    return Math.abs(utcTime - time) < (mins * 60000)
  }

  // Use sunrise or sunset if we're within 30min of it.
  if (closeTo(sunrise,15)) { return gradient.sunrise }
  if (closeTo(sunset,15)) { return gradient.sunset }

  // In the 30min before/after, use dawn/twilight.
  if (closeTo(sunrise,45) && utcTime < sunrise) { return gradient.dawn }
  if (closeTo(sunset,45) && utcTime > sunset) { return gradient.twilight }

  // Otherwise, if it's night, return night.
  if (isNight(currentDate)) { return gradient.night }

  // If it's around noon, the sun is high in the sky.
  if (currentDate.getHours() == 12) { return gradient.noon }

  // Otherwise, return the "typical" theme.
  return gradient.midday
}

// Set up the locationData object.
async function setupLocation() {

  locationData = {}
  const locationPath = files.joinPath(files.documentsDirectory(), "weather-cal-location")

  // If our location is unlocked or cache doesn't exist, ask iOS for location.
  var readLocationFromFile = false
  if (!lockLocation || !files.fileExists(locationPath)) {
    try {
      const location = await Location.current()
      locationData.latitude = location.latitude
      locationData.longitude = location.longitude
      files.writeString(locationPath, location.latitude + "," + location.longitude)
    
    } catch(e) {
      // If we fail in unlocked mode, read it from the cache.
      if (!lockLocation) { readLocationFromFile = true }
      
      // We can't recover if we fail on first run in locked mode.
      else { return }
    }
  }
  
  // If our location is locked or we need to read from file, do it.
  if (lockLocation || readLocationFromFile) {
    const locationStr = files.readString(locationPath).split(",")
    locationData.latitude = locationStr[0]
    locationData.longitude = locationStr[1]
  }
}

// Set up the sunData object.
async function setupSunrise() {

  // Requirements: location
  if (!locationData) { await setupLocation() }

  // Set up the sunrise/sunset cache.
  const sunCachePath = files.joinPath(files.documentsDirectory(), "weather-cal-sun")
  const sunCacheExists = files.fileExists(sunCachePath)
  const sunCacheDate = sunCacheExists ? files.modificationDate(sunCachePath) : 0
  var sunDataRaw

  // If cache exists and it was created today, use cached data.
  if (sunCacheExists && sameDay(currentDate, sunCacheDate)) {
    const sunCache = files.readString(sunCachePath)
    sunDataRaw = JSON.parse(sunCache)

  // Otherwise, use the API to get sunrise and sunset times.
  } else {
    const sunReq = "https://api.sunrise-sunset.org/json?lat=" + locationData.latitude + "&lng=" + locationData.longitude + "&formatted=0&date=" + currentDate.getFullYear() + "-" + (currentDate.getMonth()+1) + "-" + currentDate.getDate()
    sunDataRaw = await new Request(sunReq).loadJSON()
    files.writeString(sunCachePath, JSON.stringify(sunDataRaw))
  }

  // Store the timing values.
  sunData = {}
  sunData.sunrise = new Date(sunDataRaw.results.sunrise).getTime()
  sunData.sunset = new Date(sunDataRaw.results.sunset).getTime()
}

// Set up the weatherData object.
async function setupWeather() {

  // Requirements: location
  if (!locationData) { await setupLocation() }

  // Set up the cache.
  const cachePath = files.joinPath(files.documentsDirectory(), "weather-cal-cache")
  const cacheExists = files.fileExists(cachePath)
  const cacheDate = cacheExists ? files.modificationDate(cachePath) : 0
  var weatherDataRaw

  // If cache exists and it's been less than 60 seconds since last request, use cached data.
  if (cacheExists && (currentDate.getTime() - cacheDate.getTime()) < 60000) {
    const cache = files.readString(cachePath)
    weatherDataRaw = JSON.parse(cache)

  // Otherwise, use the API to get new weather data.
  } else {
    const weatherReq = "https://api.openweathermap.org/data/2.5/onecall?lat=" + locationData.latitude + "&lon=" + locationData.longitude + "&exclude=minutely,alerts&units=" + weatherSettings.units + "&lang=" + locale + "&appid=" + apiKey
    weatherDataRaw = await new Request(weatherReq).loadJSON()
    files.writeString(cachePath, JSON.stringify(weatherDataRaw))
  }

  // Store the weather values.
  weatherData = {}
  weatherData.currentTemp = weatherDataRaw.current.temp
  weatherData.currentCondition = weatherDataRaw.current.weather[0].id
  weatherData.todayHigh = weatherDataRaw.daily[0].temp.max
  weatherData.todayLow = weatherDataRaw.daily[0].temp.min

  weatherData.nextHourTemp = weatherDataRaw.hourly[1].temp
  weatherData.nextHourCondition = weatherDataRaw.hourly[1].weather[0].id

  weatherData.tomorrowHigh = weatherDataRaw.daily[1].temp.max
  weatherData.tomorrowLow = weatherDataRaw.daily[1].temp.min
  weatherData.tomorrowCondition = weatherDataRaw.daily[1].weather[0].id
}

/*
 * WIDGET ITEMS
 * These functions display items on the widget.
 * ============================================
 */

// Display the date on the widget.
async function date(column) {

  // Requirements: events (if dynamicDateSize is enabled)
  if (!eventData && dateSettings.dynamicDateSize) { await setupEvents() }

  // Set up the date formatter and set its locale.
  let df = new DateFormatter()
  df.locale = locale
  
  // Show small if it's hard coded, or if it's dynamic and events are visible.
  if (dateSettings.staticDateSize == "small" || (dateSettings.dynamicDateSize && eventData.eventsAreVisible)) {
    let dateStack = align(column)
    dateStack.setPadding(padding, padding, padding, padding)

    df.dateFormat = dateSettings.smallDateFormat
    let dateText = provideText(df.string(currentDate), dateStack, textFormat.smallDate)
    
  // Otherwise, show the large date.
  } else {
    let dateOneStack = align(column)
    df.dateFormat = dateSettings.largeDateLineOne
    let dateOne = provideText(df.string(currentDate), dateOneStack, textFormat.largeDate1)
    dateOneStack.setPadding(padding, padding, 0, padding)
    
    let dateTwoStack = align(column)
    df.dateFormat = dateSettings.largeDateLineTwo
    let dateTwo = provideText(df.string(currentDate), dateTwoStack, textFormat.largeDate2)
    dateTwoStack.setPadding(0, padding, padding, 10)
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

  // Requirements: events
  if (!eventData) { await setupEvents() }

  // If nothing should be displayed, just return.
  if (!eventData.eventsAreVisible && !localizedText.noEventMessage.length) { return }
  
  // Set up the event stack.
  let eventStack = column.addStack()
  eventStack.layoutVertically()
  const todaySeconds = Math.floor(currentDate.getTime() / 1000) - 978307200
  eventStack.url = 'calshow:' + todaySeconds
  
  // If there are no events and we have a message, show it and return.
  if (!eventData.eventsAreVisible && localizedText.noEventMessage.length) {
    let message = provideText(localizedText.noEventMessage, eventStack, textFormat.noEvents)
    eventStack.setPadding(padding, padding, padding, padding)
    return
  }
  
  // If we're not showing the message, don't pad the event stack.
  eventStack.setPadding(0, 0, 0, 0)
  
  // Add each event to the stack.
  var currentStack = eventStack
  const futureEvents = eventData.futureEvents
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
      eventLabelStack.setPadding(i==0 ? padding : padding/2, padding, padding/2, padding)
      continue
    }
    
    const titleStack = align(currentStack)
    titleStack.layoutHorizontally()
    const showCalendarColor = eventSettings.showCalendarColor
    const colorShape = showCalendarColor.includes("circle") ? "circle" : "rectangle"
    
    // If we're showing a color, and it's not shown on the right, add it to the left.
    if (showCalendarColor.length && !showCalendarColor.includes("right")) {
      let colorItemText = provideTextSymbol(colorShape) + " "
      let colorItem = provideText(colorItemText, titleStack, textFormat.eventTitle)
      colorItem.textColor = event.calendar.color
    }

    const title = provideText(event.title.trim(), titleStack, textFormat.eventTitle)
    titleStack.setPadding(i==0 ? padding : padding/2, padding, event.isAllDay ? padding/2 : padding/10, padding)
    
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
    let df = new DateFormatter()
    df.locale = locale
    df.useNoDateStyle()
    df.useShortTimeStyle()
    let timeText = df.string(event.startDate)
    
    // If we show the length as time, add an en dash and the time.
    if (eventSettings.showEventLength == "time") { 
      timeText += "–" + df.string(event.endDate) 
      
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
    timeStack.setPadding(0, padding, i==futureEvents.length-1 ? padding : padding/2, padding)
  }
}

// Display the current weather.
async function current(column) {

  // Requirements: weather and sunrise
  if (!weatherData) { await setupWeather() }
  if (!sunData) { await setupSunrise() }

  // Set up the current weather stack.
  let currentWeatherStack = column.addStack()
  currentWeatherStack.layoutVertically()
  currentWeatherStack.setPadding(0, 0, 0, 0)
  currentWeatherStack.url = "https://weather.com/weather/today/l/" + locationData.latitude + "," + locationData.longitude

  // Show the current condition symbol.
  let mainConditionStack = align(currentWeatherStack)
  let mainCondition = mainConditionStack.addImage(provideSymbol(weatherData.currentCondition,isNight(currentDate)))
  mainCondition.imageSize = new Size(22,22)
  mainConditionStack.setPadding(padding, padding, 0, padding)

  // Show the current temperature.
  const tempStack = align(currentWeatherStack)
  tempStack.setPadding(0, padding, 0, padding)
  const tempText = Math.round(weatherData.currentTemp) + "°"
  const temp = provideText(tempText, tempStack, textFormat.largeTemp)
  
  // If we're not showing the high and low, end it here.
  if (!weatherSettings.showHighLow) { return }

  // Show the temp bar and high/low values.
  let tempBarStack = align(currentWeatherStack)
  tempBarStack.layoutVertically()
  tempBarStack.setPadding(0, padding, padding/2, padding)
  
  let tempBar = drawTempBar()
  let tempBarImage = tempBarStack.addImage(tempBar)
  tempBarImage.size = new Size(50,0)
  
  tempBarStack.addSpacer(1)
  
  let highLowStack = tempBarStack.addStack()
  highLowStack.layoutHorizontally()
  
  const mainLowText = Math.round(weatherData.todayLow).toString()
  const mainLow = provideText(mainLowText, highLowStack, textFormat.tinyTemp)
  highLowStack.addSpacer()
  const mainHighText = Math.round(weatherData.todayHigh).toString()
  const mainHigh = provideText(mainHighText, highLowStack, textFormat.tinyTemp)
  
  tempBarStack.size = new Size(70,30)
}

// Display upcoming weather.
async function future(column) {

  // Requirements: weather and sunrise
  if (!weatherData) { await setupWeather() }
  if (!sunData) { await setupSunrise() }

  // Set up the future weather stack.
  let futureWeatherStack = column.addStack()
  futureWeatherStack.layoutVertically()
  futureWeatherStack.setPadding(0, 0, 0, 0)
  futureWeatherStack.url = "https://weather.com/weather/tenday/l/" + locationData.latitude + "," + locationData.longitude

  // Determine if we should show the next hour.
  const showNextHour = (currentDate.getHours() < weatherSettings.tomorrowShownAtHour)
  
  // Set the label value.
  const subLabelStack = align(futureWeatherStack)
  const subLabelText = showNextHour ? localizedText.nextHourLabel : localizedText.tomorrowLabel
  const subLabel = provideText(subLabelText, subLabelStack, textFormat.smallTemp)
  subLabelStack.setPadding(0, padding, padding/4, padding)
  
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
  
  let subCondition = subConditionStack.addImage(provideSymbol(showNextHour ? weatherData.nextHourCondition : weatherData.tomorrowCondition,nightCondition))
  const subConditionSize = showNextHour ? 14 : 18
  subCondition.imageSize = new Size(subConditionSize, subConditionSize)
  subConditionStack.addSpacer(5)
  
  // The next part of the display changes significantly for next hour vs tomorrow.
  if (showNextHour) {
    const subTempText = Math.round(weatherData.nextHourTemp) + "°"
    const subTemp = provideText(subTempText, subConditionStack, textFormat.smallTemp)
    
  } else {
    let tomorrowLine = subConditionStack.addImage(drawVerticalLine(new Color("ffffff", 0.5), 20))
    tomorrowLine.imageSize = new Size(3,28)
    subConditionStack.addSpacer(5)
    let tomorrowStack = subConditionStack.addStack()
    tomorrowStack.layoutVertically()
    
    const tomorrowHighText = Math.round(weatherData.tomorrowHigh) + ""
    const tomorrowHigh = provideText(tomorrowHighText, tomorrowStack, textFormat.tinyTemp)
    tomorrowStack.addSpacer(4)
    const tomorrowLowText = Math.round(weatherData.tomorrowLow) + ""
    const tomorrowLow = provideText(tomorrowLowText, tomorrowStack, textFormat.tinyTemp)
  }
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

// Provide the SF Symbols battery icon depending on the battery level
function provideBatteryIcon() {

  const batteryLevel = Device.batteryLevel()

  if ( Device.isCharging() ) {

    let batIcon = SFSymbol.named("battery.100.bolt")
    batIcon.applyLightWeight()

    return batIcon.image

  } else

    if ( Math.round(batteryLevel * 100) > 65 ) {

      let batIcon = SFSymbol.named("battery.100")
      batIcon.applyLightWeight()

      return batIcon.image

    } else if ( Math.round(batteryLevel * 100) > 30 ) {

      let batIcon = SFSymbol.named("battery.25")
      batIcon.applyLightWeight()

      return batIcon.image

    } else {

      let batIcon = SFSymbol.named("battery.0")
      batIcon.applySemiboldWeight()

      return batIcon.image
    }

}

// Add a battery element to the widget; consisting of a battery icon and percentage
async function battery(column, alignment) {

  // Get battery level via Scriptable function and format it in a convenient way
  function getBatteryLevel() {
  
    const batteryLevel = Device.batteryLevel()
    const batteryPercentage = `${Math.round(batteryLevel * 100)}%`

    return batteryPercentage
  }

  const batteryLevel = Device.batteryLevel()
  
  // Set up the battery level item
  let batteryStack = align(column, alignment)
  batteryStack.layoutHorizontally()
  batteryStack.centerAlignContent()

  let batteryIcon = batteryStack.addImage(provideBatteryIcon())
  batteryIcon.imageSize = new Size(30,30)
  

  // Change the battery icon to red if battery level is <= 20 to match system behavior
  if ( Math.round(batteryLevel * 100) > 20 || Device.isCharging() ) {

    batteryIcon.tintColor = Color.white()

  } else {

    batteryIcon.tintColor = Color.red()

  }

  batteryStack.addSpacer(8)

  // Display the battery status
  let batteryInfo = provideText(getBatteryLevel(), batteryStack, textFormat.battery)

  batteryStack.setPadding(10, 10, 10, 10)

}

/*
 * HELPER FUNCTIONS
 * These functions perform duties for other functions.
 * ===================================================
 */

// Determines if the provided date is at night.
function isNight(dateInput) {
  const timeValue = dateInput.getTime()
  return (timeValue < sunData.sunrise) || (timeValue > sunData.sunset)
}

// Determines if two dates occur on the same day
function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
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

// Provide a symbol based on the condition.
function provideSymbol(cond,night) {
  
  // Define our symbol equivalencies.
  let symbols = {
  
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
  const textFont = format.font || textFormat.defaultText.font
  const textSize = format.size || textFormat.defaultText.size
  const textColor = format.color || textFormat.defaultText.color
  
  textItem.font = provideFont(textFont, textSize)
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
  barPath.addRoundedRect(new Rect(0, 0, height, height), width/2, width/2)
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
  let percent = (weatherData.currentTemp - weatherData.todayLow) / (weatherData.todayHigh - weatherData.todayLow)

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
  draw.setFillColor(new Color("ffffff", 0.5))
  draw.fillPath()

  // Make the path for the current temp indicator.
  let currPath = new Path()
  currPath.addEllipse(new Rect(currPosition, 0, tempBarHeight, tempBarHeight))
  draw.addPath(currPath)
  draw.setFillColor(new Color("ffffff", 1))
  draw.fillPath()

  return draw.getImage()
}
