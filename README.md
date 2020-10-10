# Weather Cal
This is a Scriptable widget that allows you to display, position, and format multiple elements, including the date, a greeting, your upcoming events, the current weather, and future weather. You can even create your own elements by writing a function that has a single WidgetStack as an argument (representing a column).

## How to set it up
You'll need to make a couple edits to the weather-cal.js file before you start. You can edit on your computer and transfer to iOS, or just edit in Scriptable itself.

1. Get a [free OpenWeather API key](http://openweathermap.org/api). Paste the key into `apiKey = ""` between the quotation marks. Note that it may take a few hours for the key to work.
2. Make any other adjustments to the widget settings at the top of the file. 
3. Run the script. It should prompt you for your location and (if enabled) your background photo. At the end, it will show a preview of the widget.
4. Add a Scriptable widget to your home screen and select the script. That's it!

Want a transparent widget? Use [my transparent widget script](https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9) first. At the end of that script, select "Export to Photos", and then use the photo in the Weather Cal setup.

## How it works
To make your layout, find the `LAYOUT` section header. You'll see two areas with lists of items: one for the left column, one for the right column. You can add and remove items from each list. Don't make changes to other parts of the code in this area (except for the column width). And, make sure every item ends with a comma, like this:

```
left,
date,

space,

right,
events,
```
    
Adding an alignment key, like `left`, `right`, or `center` will apply that alignment to everything after it. Adding `space` will add a space that automatically expands to fill the available room in the widget. Everything above the space will align to the top, and everything below will align to the bottom.

## Technical details
The `LAYOUT` section contains an array of objects which each represent a column in the widget. By default, there are two columns in the `columns` array—but it is possible to add or remove columns if desired. Users decide what will appear in each column by adding and removing items from the `items` array in each column.

When run, the script creates a WidgetStack with the provided width for each column. It then iterates through each column’s `items` array. Every item is a function, so the script calls the function and passes the WidgetStack representing the current column as an argument. Since most widget items need to perform asynchronous work, the script uses an `await` expression when calling the function.

### Creating a widget item
If you would like to create your own widget items, consider the following required and optional elements:

* __Required:__ A function with the name of the widget item, for example: `function date(column)`. The name of the function is what gets entered by the user in the `LAYOUT` section. This function needs to have a single `column` argument, representing the WidgetStack that the function will be adding elements to. It’s best to make this an `async` function, since most widget items will need to perform asynchronous work. 

* __Conditionally required:__ If a widget item displays text, it should use the `formatText` function along with a value in the `textFormat` object. Existing values can be used if they make sense, or values can be added.

* __Conditionally required:__ If a widget needs to display predefined strings like labels, they must be defined in the `localizedText` object. This allows users to easily translate text into their preferred language. 

* __Optional:__ A settings object that lets the user choose how the widget item is displayed. Match the existing format in the `ITEM SETTINGS` section using a comment header and comments explaining each setting or group of settings. A small number of well-considered, powerful settings is best.

* __Optional:__ A variable for storing structured data that your item needs. The name should be one word followed by “Data”. For example: `weatherData`. Declare it alongside the other data variables (`eventData`, `locationData`, etc). Make sure there isn’t an existing data variable that has the information needed for your item.

* __Conditionally required:__ If a widget item uses a data variable, a setup function is required. The name should be “setup” followed by one word. For example: `setupWeather`. If you’re using a setup function, the item function should check to see if the data is null, and run the setup function if it is. For example: `if (!weatherData) { await setupWeather() }`. This allows other widget items to use the provided data if needed. For example, the `current` and `future` weather items both use `weatherData`, so they both check this variable and run the setup if needed.
