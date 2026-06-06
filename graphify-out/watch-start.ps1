$PY = "C:\Users\feytell2\AppData\Local\Programs\Python\Python312\python.exe"
Set-Location "C:\Users\feytell2\Documents\projects\hall-booking-pwa"
& $PY -m graphify.watch "C:\Users\feytell2\Documents\projects\hall-booking-pwa" --debounce 3 *>> "C:\Users\feytell2\Documents\projects\hall-booking-pwa\graphify-out\watch.log"
