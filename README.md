# Weather Cal
This is a Scriptable widget that allows you to display, position, and format multiple elements, including the date, a greeting, your upcoming events, the current weather, and future weather. 

## How to set it up
1. Edit the weather-cal.js file. You can edit on your computer and transfer to iOS, or just edit in Scriptable itself.
2. Get a [free OpenWeather API key](http://openweathermap.org/api). Paste the key into `apiKey = ""` between the quotation marks. Note that it may take a few hours for the key to work.
3. Make any other adjustments to the widget settings at the top of the file.
4. Run the script. It should prompt you for your location and (if enabled) your background photo. It should pop up a preview of the widget.
5. Add a Scriptable widget to your home screen and select the script. That's it!

Want a transparent widget? Use [my transparent widget script](https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9) first. At the end of that script, select "Export to Photos", and then use the photo in the Weather Cal setup. If you want to change the image, you can set `forceImageUpdate = true`. Run the script, and it will prompt you for a new photo. Remember to always change it back to `false` when you're done.
