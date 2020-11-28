# Weather Cal

<img src="https://github.com/mzeryck/Weather-Cal/blob/main/images/header.jpg" width="318" height="300" alt="Screenshot of a sample Weather Cal widget">

This is a Scriptable widget that lets you display, position, and format multiple elements without writing any Javascript code. There are [many built-in widget items](#widget-items), including events, reminders, weather, battery, and much more. Weather Cal also fully supports [custom items](#custom-elements), and you can even [embed existing widgets](#embed-existing-widgets) into Weather Cal items.

## Table of contents
- [Setup](#setup)
- [Settings](#settings)
- [Layout](#layout)
  - [Widget items](#widget-items)
  - [Spacing and alignment](#spacing-and-alignment)
  - [ASCII](#ascii)
- [Technical details](#technical-details)
- [Custom elements](#custom-elements)
  - [Custom backgrounds](#custom-backgrounds)
  - [Custom items](#custom-items)
  - [Embed existing widgets](#embed-existing-widgets)

## Setup
Setting up Weather Cal is easy:

1. Copy the code in [weather-cal.js](https://raw.githubusercontent.com/mzeryck/Weather-Cal/main/weather-cal.js). (You don't need to do anything with weather-cal-code.js.)

2. Paste the code into a new Scriptable script. This is the widget script.

3. Run the script. It will download the code script in the background and walk you through each step of the setup process.

![Screenshots showing how to set up Weather Cal](https://github.com/mzeryck/Weather-Cal/blob/main/images/setup.jpg)

Once Weather Cal is set up, you can make multiple widgets by duplicating the widget script. You only need one copy of the Weather Cal code script.

If you want a transparent or translucent widget, use [the Widget Blur script](https://github.com/mzeryck/Widget-Blur/). At the end of that script, select "Export to Photos", and then use the photo as your widget background.

## Settings
Once you've set up Weather Cal, run the widget script again to access the settings menu, where you can:

- Show a preview in the Scriptable app
- Change the background
- Edit your preferences for the widget
- Re-enter your OpenWeather API key
- Update the backend code for Weather Cal
- Reset your widget back to default settings

In the preferences menu, you can change the overall widget settings, customize the font, size, color, and language of text, and adjust settings for each individual widget item.

## Layout
The only aspect of the widget that you can't change in the settings menu is the layout. Luckily, it's easy to do. In the widget script, you'll see a section that looks similar to this:
```
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
```
The layout is just a list of [widget items](#widget-items) and [layout items](#spacing-and-alignment). Keep reading to find out which items are available and how to position them on the widget.

### Widget items
You can add the following items to your widget:
 
- `battery`
- `covid`
- `date` 
- `events` 
- `greeting`
- `reminders`
- `sunrise`, which shows the sunrise or sunset time automatically
- custom `text`, by writing `text(Your text here)`
- Weather items
	- `current` conditions
	- `future` weather (next hour or next day)
	- customizable multi-day `forecast`
- `week` - week number for current Date

If you want to change how an item looks, run the widget script and choose "Edit preferences". Most items allow you to adjust how they display.

### Spacing and alignment
You can change the layout of the widget using the following __layout items__: 

* The `row` and `column` items create the structure of the widget. You can add or remove rows and columns, just remember that you __always__ need at least one row and one column, and every row has to start with a column. If you want to specify the size of a row or column, use parentheses: `row(50)` or `column(100)`.

* You can add an alignment item (`left`, `right`, or `center`) anywhere in the layout, and it will align everything after it. 

* Using `space` will add a space that automatically expands to fill the vertical space, pushing the items above and below it. You can make fixed-sized spaces using parentheses, like this: `space(50)`.

### ASCII
If you want to [draw your widget using ASCII](https://twitter.com/mzeryck/status/1316614631868166144), delete all of the items and draw your widget like this:
```
 -------------------
 |date    |   90   |
 |battery |current |
 |sunrise |future  |
 |        |        |
 -------------------
 |           events|
 -------------------
```
A full line of `-` (dashes) starts and ends the widget, or makes a new row. Put `|` (pipes) around each column. The spaces around each element name will determine the alignment (left, right, or center). For example, `events` are aligned to the right in the example above. Adding a row with nothing in it will add a flexible space. Starting a column with a number will set it to that width. (The right-hand column in the example above has a width of 90.)

## Technical details
Weather Cal consists of the following components:

- A container script (weather-cal.js) that houses the user's layout, settings, and any  customizations.
- A modular code script (weather-cal-code.js) with the following elements:
  - A layout generator that converts simple, text-based layout descriptions into logical `WidgetStack` structures.
  - A collection of commonly-used widget items, including the date, upcoming events, and weather information.
  - A preferences editor that lets users customize how each item looks and behaves.
  - A set of helper functions for the built-in features that can also be used by custom elements.
  
Additional documentation will be in the wiki, once it is ready.

## Custom elements
You can create custom backgrounds and widget items that are not deleted when you update the Weather Cal code script. You can override any of the built-in widget items, and you can even [embed existing widgets](#embed-existing-widgets).

To begin, copy and paste `const custom = {  }` right after `const code` is declared. Your code should look like this:

```javascript
const code = importModule(codeFilename)
const custom = {  }
```

Then, modify the entire line that begins with `const widget` so it looks like this:

```javascript
const widget = await code.createWidget(layout, Script.name(), iCloudInUse, custom)
```

The "Update code" feature never modifies the weather-cal.js file, so your customizations will remain even after you update. Just make sure not to use the "Reset widget" feature, or it will overwrite your code.

### Custom backgrounds
If you want to write your own code for the widget background, just declare a `background` method in your `custom` object. This method must have a single `widget` argument, which Weather Cal uses to pass the `ListWidget` object. If this method exists, it will override the background setting of your widget. Here's a simple example:

```javascript
const custom = {
  background(widget) {
    widget.backgroundColor = Color.black()
  },
}
```

### Custom items
You can create your own widget items or even override the functionality of a built-in item. Declare a method in the `custom` object with the name of the element you'd like to create or override. Give it has a single `column` argument, which represents the `WidgetStack` object that the item will be added to. For example:

```javascript
const custom = {
  item(column) {
    // Your code here
  },
}
```

You can use any of Weather Cal's shared objects and helper functions through the `code` object. For example, you can use the `provideText` function and the `format` object to display text using one of the built-in formats, like this:

```javascript
const custom = {
  item(column) {
    code.provideText("My text here", column, code.format.smallDate)
  },
}
```

This code will display "My text here" using the small date format that's specified in the preferences. 

Documentation for Weather Cal's helper functions will be available in the wiki once it is ready.

### Embed existing widgets
Weather Cal supports embedding other Scriptable widgets. This allows you to position them alongisde other Weather Cal elements to create more flexible layouts. For example, showing Weather Cal, [PurpleAir Air Quality](https://github.com/jasonsnell/PurpleAir-AQI-Scriptable-Widget), and [Random Scriptable API](https://scriptable.app/gallery/random-scriptable-api) would normally take three separate widgets. By embedding the widgets into Weather Cal, we can acheive this with a single large widget and only one "Scriptable" label displayed:

<img src="https://github.com/mzeryck/Weather-Cal/blob/main/images/custom.jpg" width="350" height="352" alt="Screenshot of a Weather Cal widget with multiple embedded widgets">

Here's how it works:
- Before you start, [follow these directions](#custom-elements) to enable custom elements.
- Copy weather-cal-converter.js into Scriptable and run it.
- Choose a name. This is the word you'll be adding to the Weather Cal layout.
- Select the file containing the widget script.
- When it displays the code, use the share icon in the top right to copy the text.
- Open a Weather Cal widget script and paste the code into the custom object after the comment. If you're pasting multiple items, make sure to paste it after the previous comma but before the final bracket.
- In your Weather Cal layout, add the name of your new widget item.

In the screenshot above, the layout code looks like this:
```javascript
const layout = `
  row
    column
      date
      space
      aqi
      space(15)
    columns(110)
      current
      space(15)
      future
      space(15)
      battery
      sunset
  row
    column
      scriptable
`
```
And the `custom` object is structured like this:
```javascript
const custom = {
  aqi(column) {
    // Converted code is here.
  },
  scriptable(column) {
    // Converted code is here.
  },
}
```
