from mqtls import mqtls
import time

secret = "Tq2H]ePyAUar?YEk"
mac = "50:02:91:FE:14:28"

broker = mqtls("rmote.app", port=2443, user="efren@boyarizo.es",
               pw="1Q2w3e4r")

print(broker.mretrieve(mac, 6))
