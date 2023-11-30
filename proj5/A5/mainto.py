import requests
import webbrowser

# host = 'http://jacquard.ddns.uark.edu:8985'
host = 'http://gashler.com:8985'
files = {'file': open('main.js', 'rb')}
response = requests.post(f'{host}/redirect.html', files=files)

s = response.text
prefix = 'script='
beg = s.find(prefix)
s = s[beg + len(prefix):]
end = s.find('\'')
s = s[:end]

webbrowser.open(f'{host}/game.html?script={s}', new=2)



