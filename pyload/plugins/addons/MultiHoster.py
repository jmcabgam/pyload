#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re
from types import MethodType

from pyload.plugins.MultiHoster import MultiHoster as MultiHosterAccount, normalize
from pyload.plugins.Addon import Addon, AddEventListener
from pyload.PluginManager import PluginTuple


class MultiHoster(Addon):
    __version__ = "0.1"
    __internal__ = True
    __description__ = "Gives ability to use MultiHoster services."
    __config__ = []
    __author_mail__ = ("pyLoad Team",)
    __author_mail__ = ("support@pyload.org",)

    #TODO: multiple accounts - multihoster / config options

    def init(self):

        # overwritten plugins
        self.plugins = {}

    def addHoster(self, account):

        self.logInfo(_("Activated MultiHoster %s") % account.__name__)

        pluginMap = {}
        for name in self.core.pluginManager.getPlugins("hoster").keys():
            pluginMap[name.lower()] = name

        supported = []
        new_supported = []

        for hoster in account.getHosterList():
            name = normalize(hoster)

            if name in pluginMap:
                supported.append(pluginMap[name])
            else:
                new_supported.append(hoster)

        if not supported and not new_supported:
            account.logError(_("No Hoster loaded"))
            return

        klass = self.core.pluginManager.getPluginClass(account.__name__)

        # inject plugin plugin
        account.logDebug("Overwritten Hosters: %s" % ", ".join(sorted(supported)))
        for hoster in supported:
            self.plugins[hoster] = klass

        account.logDebug("New Hosters: %s" % ", ".join(sorted(new_supported)))

        # create new regexp
        patterns = [x.replace(".", "\\.") for x in new_supported]

        if klass.__pattern__:
            patterns.append(klass.__pattern__)

        regexp = r".*(%s).*" % "|".join(patterns)

        # recreate plugin tuple for new regexp
        hoster = self.core.pluginManager.getPlugins("hoster")
        p = hoster[account.__name__]
        new = PluginTuple(p.version, re.compile(regexp), p.deps, p.category, p.user, p.path)
        hoster[account.__name__] = new


    @AddEventListener("account:deleted")
    def refreshAccounts(self, plugin=None, user=None):
        self.logDebug("Re-checking accounts")

        self.plugins = {}
        for name, account in self.core.accountManager.iterAccounts():
            if isinstance(account, MultiHosterAccount) and account.isUsable():
                self.addHoster(account)

    @AddEventListener("account:updated")
    def refreshAccount(self, plugin, user):

        account = self.core.accountManager.getAccount(plugin, user)
        if isinstance(account, MultiHosterAccount) and account.isUsable():
            self.addHoster(account)

    def activate(self):
        self.refreshAccounts()

        # new method for plugin manager
        def getPlugin(self2, name):
            if name in self.plugins:
                return self.plugins[name]
            return self2.getPluginClass(name)

        pm = self.core.pluginManager
        pm.getPlugin = MethodType(getPlugin, pm, object)

    def deactivate(self):
        #restore state
        pm = self.core.pluginManager
        pm.getPlugin = pm.getPluginClass

