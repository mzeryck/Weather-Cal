# Weather Cal
This is a Scriptable widget that lets you display, position, and format multiple elements, including dates and events, weather information, battery level, and more. Make sure to read through the "Before you start" and "Setting up your widget" sections below. If you want to write code to make your own custom widget item, head to "Technical details". Happy scripting! 

## Before you start
You'll need to make a couple edits to the weather-cal.js file before you start. You can edit on your computer and transfer to iOS, or just edit in Scriptable itself.

1. Get a [free OpenWeather API key](http://openweathermap.org/api). Paste the key into `apiKey = ""` between the quotation marks. Note that it may take a few hours for the key to work.
2. Make any other adjustments to the widget settings at the top of the file. (There are more details in the "Setting up your widget" section below.)
3. Run the script. It should prompt you for permissions and (if enabled) your background photo. At the end, it will show a preview of the widget.
4. Add a Scriptable widget to your home screen and select the script in the widget settings. That's it!

Want a transparent widget? Use [my transparent widget script](https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9) first. At the end of that script, select "Export to Photos", and then use the photo in the Weather Cal setup.

## Setting up your widget
To make your layout, find the `LAYOUT` section header. You'll see some code that looks like this:

```
row,
  
  column,
  date,
  battery,
  sunrise,
  space,
  
  column(90),
  current,
  future,
    
row,
  
  column,
  events,
```

### Adding items to the widget
Each word followed by a comma is a __widget item__. You can add the following items to your widget: `date,` `greeting,` `events,` `battery,` `current,` and `future,` weather, `sunrise,` (shows sunrise and sunset), and `text,`. Make sure each item has a comma after it, and always put them underneath one of the `column,` items. 

If you want to change how an item looks, scroll down to the `ITEM SETTINGS` section. Most items allow you to adjust how they display.

### Customizing the layout
You can change the layout of the widget using the following __layout items__: 

* The `row,` and `column,` items are used to create the structure of the widget. In the code above, the widget has a row with two columns, and another row with a single column. You can add or remove rows and columns—just know that you __always__ need to add at least one column to every row. By default, rows and columns match the size of what is shown inside them. You can also specify their size using parentheses, like this: `row(50),` or `column(100),`.

* By default, all items in the widget align to the left in their column. You can add an alignment key (`left,` `right,` or `center,`) anywhere in the list, and it will apply that alignment to everything after it. 

* Adding `space,` will add a space that automatically expands to fill the vertical space in the column it's added to. This is the best way to "push" items to the top or bottom edges of the widget. If you need to, you can make fixed-sized spaces like this: `space(50),`.

## Technical details
Users add and remove items from the `items` array in the `LAYOUT` section to determine what is shown in the widget. Items are either function objects (`events`) or they are function calls (`space(50)`) which return a function object. Either way, the widget construction code expects each item to be a function that takes a single `column` argument.

When the script runs, it simply calls each function in the `items` array and passes the current column. Since most widget items need to perform asynchronous work, the script uses an `await` expression when calling the function.

The layout items discussed above are special in that they use and modify the global `currentRow`, `currentColumn`, and `currentAlignment` variables in order to create rows and columns or adjust the alignment.

### Creating a widget item
Each widget item has the following required and optional elements:

* __Required:__ A function with the name of the widget item, for example: `function date(column)`. The name of the function is what gets entered by the user in the `LAYOUT` section. This function needs to have a single `column` argument, representing the WidgetStack that the function will be adding elements to. For padding around the element, use the global `padding` variable as a baseline.

* __Conditionally required:__ If a widget item displays text, it should use the `provideText` function along with a value in the `textFormat` object. Existing values can be used if they make sense, or values can be added.

* __Conditionally required:__ If a widget needs to display predefined strings like labels, they must be defined in the `localizedText` object. This allows users to easily translate text into their preferred language. 

* __Optional:__ A settings object that lets the user choose how the widget item is displayed. Match the existing format in the `ITEM SETTINGS` section using a comment header and comments explaining each setting or group of settings. A small number of well-considered, powerful settings is best.

* __Optional:__ A variable for storing structured data that your item needs. The name should be one word followed by “Data”. For example: `weatherData`. Declare it alongside the other data variables (`eventData`, `locationData`, etc). Make sure there isn’t an existing data variable that has the information needed for your item.

* __Conditionally required:__ If a widget item uses a data variable, a setup function is required. The name should be “setup” followed by one word. For example: `setupWeather`. If you’re using a setup function, the item function should check to see if the data is null, and run the setup function if it is. For example: `if (!weatherData) { await setupWeather() }`. This allows other widget items to use the provided data if needed. For example, the `current` and `future` weather items both use `weatherData`, so they both check this variable and run the setup if needed.
