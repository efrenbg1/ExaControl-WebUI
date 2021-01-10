import socket
import ssl
import threading
import select
import time


class mqtls:
    def __init__(self, host="127.0.0.1", port=2443, user=None, pw=None, timeout=1):
        self._host = host
        self._port = port
        self._user = user
        self._pw = pw
        self._timeout = timeout
        self._socket = None
        self._broker = None
        self._lock = threading.Lock()
        self._exception = ""
        with self._lock:
            self.__connect()

    def __enc(self, string):
        return str(len(string)).zfill(2) + string

    def __connect(self):
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.connect((self._host, self._port))
        # self._socket.settimeout(10)
        self._broker = ssl.wrap_socket(self._socket)
        self._broker.setblocking(0)
        if not self._broker:
            raise Exception("Could not connect to broker!")
        if self._user and self._pw:
            self.__login()

    def __login(self):
        msg = "MQS0" + self.__enc(self._user) + self.__enc(self._pw) + "1"
        self.__send(msg)
        rx = self.__receive()
        if rx is None:
            raise Exception(
                "MqTLS: error in auth ({})".format(self._exception))
        if len(rx) < 4:
            raise Exception(
                "MqTLS: error in auth (invalid response from server)")
        if rx[:4] != "MQS0":
            raise Exception("MqTLS: error in auth (invalid credentials)")

    def __send(self, data):
        self._broker.send(str.encode(data + '\n'))

    def __receive(self):
        start = time.time()
        while True:
            try:
                rx = self._broker.read(210)
                if rx != b'':
                    return rx.decode('utf-8')
                self._exception = "connection closed by broker"
                return None
            except ssl.SSLWantReadError:
                pass
            if (time.time()-start) > self._timeout:
                self._exception = "timed out while waiting for response! Is broker up?"
                return None
            time.sleep(0.001)  # Don't block waiting for I/O

    def __communicate(self, data):
        with self._lock:
            # Clean buffer before communicating
            try:
                while self._broker.read(210) != b'':
                    continue
            except ssl.SSLWantReadError:
                pass

            # Send data and read response
            self.__send(data)
            rx = self.__receive()

            # If no data received, retry
            if rx is None:
                self.__connect()
                self.__send(data)
                rx = self.__receive()

            return rx

    def publish(self, topic, slot, message):
        if self._user is None:
            msg = "MQS6"
        else:
            msg = "MQS1"
        msg += self.__enc(topic) + str(slot) + self.__enc(message)
        rx = self.__communicate(msg)

        if rx is None:
            raise Exception(
                "MqTLS: error in publish ({})".format(self._exception))
        if len(rx) < 4:
            return False
        if rx[:4] == "MQS1":
            return True

    def retrieve(self, topic, slot):
        if self._user is None:
            msg = "MQS7"
        else:
            msg = "MQS2"
        msg += self.__enc(topic) + str(slot)
        rx = self.__communicate(msg)
        if rx is None:
            raise Exception(
                "MqTLS: error in retrieve ({})".format(self._exception))
        if len(rx) < 4:
            return None
        if rx[:4] == "MQS7":
            return None
        if rx[:4] == "MQS2":
            return rx[6:6+int(rx[4:6])]

    def muser(self, user):
        msg = "MQS8" + self.__enc(user)
        rx = self.__communicate(msg)
        if rx is None:
            raise Exception("MqTLS: error in user update")
        if len(rx) < 4:
            return False
        if rx[:4] == "MQS8":
            return True
        return False

    def macls(self, user):
        msg = "MQS9" + self.__enc(user)
        rx = self.__communicate(msg)
        if rx is None:
            raise Exception("MqTLS: error in acls update")
        if len(rx) < 4:
            return False
        if rx[:4] == "MQS9":
            return True
        return False
