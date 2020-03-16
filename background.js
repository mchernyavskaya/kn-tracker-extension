var KnTrackerConstants = {
    URL_PREFIX: "https://konto.service.berlin.de/",
    MESSAGE_SELECTOR: "GatewayMaster_ContentSection_lblEingangstext"
}

var KnStatuses = {
    requestSent: {
        id: "requestSent",
        priority: 0,
        tpl: "Sehr geehrte Betreuungsperson, wir haben Ihre Anfrage (\\S*) für die Einrichtung (.*) und das Kind (?:.*) erhalten."
    },
    requestRefused: {
        id: "requestRefused",
        priority: 1,
        tpl: "Sehr geehrte Betreuungsperson, leider müssen wir die von Ihnen gestellte Anfrage (\\S*) für die Einrichtung (.*) und das Kind (?:.*) ablehnen. Ablehnungsgrund: (.*)"
    },
    waitList: {
        id: "waitList",
        priority: 2,
        tpl: "Sehr geehrte Betreuungsperson, wir haben Ihre Anfrage (\\S*) für die Einrichtung (.*) und das Kind (?:.*) auf die Warteliste übernommen und werden diese bei der Planung der Kitaplatzvergabe berücksichtigen."
    },

    fromId(id) {
        return KnStatuses[id] || false;
    }
}

var KnTracker = {
    parseAllPossible(tab) {
        this.parseRequestSentNotification(tab);
        this.parseRefusedNotification(tab);
        this.parseWaitListNotification(tab);
    },

    parseRequestSentNotification(tab) {
        this.parseMessage(tab, KnTrackerConstants.MESSAGE_SELECTOR,
            KnStatuses.requestSent.tpl, KnStatuses.requestSent.id);
    },

    parseRefusedNotification(tab) {
        this.parseMessage(tab, KnTrackerConstants.MESSAGE_SELECTOR,
            KnStatuses.requestRefused.tpl, KnStatuses.requestRefused.id);
    },

    parseWaitListNotification(tab) {
        this.parseMessage(tab, KnTrackerConstants.MESSAGE_SELECTOR,
            KnStatuses.waitList.tpl, KnStatuses.waitList.id);
    },

    parseMessage(tab, selector, tpl, messageType) {
        var script = `
                var el = document.getElementById('${selector}');
                if (!!el) {
                    var rx = /${tpl}/i;
                    console && console.log(rx);
                    if (rx.test(el.innerText)) {
                        console && console.log('Found element of type ${messageType}', el);
                        var result = rx.exec(el.innerText);
                        if (result && result.length > 1) {
                            var reqId = result[1];
                            var kitaName = result[2];
                            console && console.log(\`\${reqId}: \${kitaName}\`);
                            var reqIdStr = \`\${reqId}\`;
                            console && console.log(localStorage.getItem(reqIdStr));
                            var item = JSON.parse(localStorage.getItem(reqIdStr) || '{}');
                            console && console.log('item found', item);
                            item.kitaName = kitaName;
                            console && console.log('message type', '${messageType}');
                            item['${messageType}'] = el.innerText;
                            console && console.log('item to save', item);
                            localStorage.setItem(reqIdStr, JSON.stringify(item));
                        }
                    }
                }`;
        chrome.tabs.executeScript(tab.tabId, { code: script });
    }
};

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url && tab.url.indexOf(KnTrackerConstants.URL_PREFIX) == 0) {
        KnTracker.parseAllPossible(tab);
    } else {
        console && console.log('tabUpdated', tab);
    }
});