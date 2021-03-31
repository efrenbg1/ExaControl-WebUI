from flask import Flask, redirect, send_from_directory, request, render_template, Response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from mqtls import mqtls
import json
import traceback
import secret
import checksumdir
import os

app = Flask(__name__, template_folder="static")
limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

broker = mqtls()

hash = checksumdir.dirhash(os.path.join(os.getcwd(), 'static'))[0:4]


@app.route('/update')
@limiter.limit("2/second")
def update():
    if request.headers.get('secret') != secret.cookie:
        return "401 (Unauthorized)", 401

    response = {
        'status': broker.retrieve(secret.mac, 0),
        'ONtemp': broker.retrieve(secret.mac, 1),
        'OFFtemp': broker.retrieve(secret.mac, 2),
        'target': broker.retrieve(secret.mac, 3),
        'ONtime': broker.retrieve(secret.mac, 4),
        'OFFtime': broker.retrieve(secret.mac, 5),
        'temp': broker.retrieve(secret.mac, 6)
    }
    return json.dumps(response)


@app.route('/set')
@limiter.limit("2/second")
def set():
    if request.headers.get('secret') != secret.cookie:
        return "401 (Unauthorized)", 401

    key = request.args.get('key')
    if not isinstance(key, str):
        return "400 (Bad request)", 400

    value = request.args.get('value')
    if not isinstance(value, str):
        return "400 (Bad request)", 400

    broker.publish(secret.mac, key, value)
    return json.dumps({"done": True})


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static/', path)


@app.route('/')
def index():
    return render_template('index.html', hash=hash)


@app.route('/sw.js')
def sw():
    return Response(render_template('sw.js', hash=hash, prevent="/update"), mimetype='application/javascript')


@app.route('/index.html')
def redirectNoFile():
    return redirect('/')


@app.errorhandler(404)
def not_found(e):
    return redirect('/')


@app.errorhandler(Exception)
def catch(e):
    print(traceback.print_exc())
    return "500 (Internal Server Error)", 500


@app.errorhandler(429)
def ratelimit_handler(e):
    return "429 (Too Many Requests)", 429


if __name__ == '__main__':
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run()
