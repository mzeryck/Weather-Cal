# Weather Cal
This is a Scriptable widget that lets you display, position, and format multiple elements, including dates and events, weather information, battery level, and more. If you want to write code to make your own custom widget item, head to "Technical details". Happy scripting! 

## Setup
Setting up Weather Cal is easy. Add the code in weather-cal.js to Scriptable on your device by downloading the file into the Scriptable folder in iCloud Drive or copying and pasting the code into a new Scriptable script. When you run the script, it will walk you through each step of the setup process.

If you want a transparent or translucent blurred widget, use [the Widget Blur script](https://github.com/mzeryck/Widget-Blur/blob/main/widget-blur.js) before you start. At the end of that script, select "Export to Photos", and then use the photo in the Weather Cal setup.

## Customization
Changing the items that appear on your widget is easy. Scroll to the section of the code that looks like this:

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

Each word is a __widget item__. You can add the following items to your widget: `battery`, `date`, `events`, `greeting`, `reminders`, your own custom `text`, `sunrise` (shows sunrise and sunset), and multiple weather items, including the `current` conditions, `future` weather (next hour or next day), and a customizable multi-day `forecast`. If you want to change how an item looks, scroll down to the `ITEM SETTINGS` section. Most items allow you to adjust how they display.

### Available Options
- battery
- date
- greeting
- events
- reminders
- current
- future
- forecast
- sunrise
- sunset
- text
- space
- covid

### Layout
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
Weather Cal consists of two scripts: the Weather Cal widget (weather-cal.js) and the Weather Cal code (weather-cal-code.js). When a user first runs the widget script, it downloads the code and saves it as a Scriptable script. It then imports that code as a module and runs it. The widget script is essentially a container for the widget settings, while the code script does the heavy lifting.

### Widget construction
Users add and remove items from the `layout` string in the `settings` object to determine what is shown in the widget. When the script runs, it parses this string and isolates each item, using the `provideFunction` function to get the corresponding widget item function. If an argument was provided using parentheses, the provided parameter is passed to the function, which acts as a generator. Finally, the item function is passed the current column (a WidgetStack) so it can run.

### Creating a widget item
Each widget item has the following required and optional elements:

* __Required:__ A function with the name of the widget item, for example: `function date(column)`. The name of the function is what gets entered by the user in the `LAYOUT` section. This function needs to have a single `column` argument, representing the WidgetStack that the function will be adding elements to. For padding around the element, use the global `padding` variable as a baseline.

* __Required:__ Add a value to the `provideFunction` function so the parser knows it exists.

* __Optional:__ A settings object that lets the user choose how the widget item is displayed. Match the existing format in the `ITEM SETTINGS` section using a comment header and comments explaining each setting or group of settings. A small number of well-considered, powerful settings is best.

### Getting data
Many widget items need to perform asynchronous work to get the data they will display, like the user's location or weather information. The standard way of doing this is creating a setup function that stores data in the shared `data` variable. For example, `setupWeather` stores several data points in `data.weather`. In the `current` and `future` weather items, they begin by checking to see if the data exists: `if (!data.weather) { await setupWeather() }`. 

### Displaying text
To display text, the `provideText` function takes a string, a stack, and a value in the `textFormat` object. If you need to display predefined strings like labels, they must be defined in the `localizedText` object. This allows users to easily translate text into their preferred language. 
