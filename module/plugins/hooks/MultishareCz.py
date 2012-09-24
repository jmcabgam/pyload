# -*- coding: utf-8 -*-

from module.network.RequestFactory import getURL
from module.plugins.internal.MultiHoster import MultiHoster
import re

def getConfigSet(option):
    s = set(option.lower().split('|'))
    s.discard(u'')
    return s

class MultishareCz(MultiHoster):
    __name__ = "MultishareCz"
    __version__ = "0.04"
    __type__ = "hook"
    __config__ = [("activated", "bool", "Activated", "False"),
        ("hosterListMode", "all;listed;unlisted", "Use for hosters (if supported)", "all"),
        ("hosterList", "str", "Hoster list (comma separated)", "uloz.to")]
    __description__ = """MultiShare.cz hook plugin"""
    __author_name__ = ("zoidberg")
    __author_mail__ = ("zoidberg@mujmail.cz")

    HOSTER_PATTERN = r'<img class="logo-shareserveru"[^>]*?alt="([^"]+)"></td>\s*<td class="stav">[^>]*?alt="OK"'

    def getHoster(self):

        page = getURL("http://www.multishare.cz/monitoring/")
        return re.findall(self.HOSTER_PATTERN, page)