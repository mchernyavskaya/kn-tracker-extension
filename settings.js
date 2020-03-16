var KnSettingsConstants = {
    TABLE_ID: 'knRequestsTable',
    EVT_LOADED: 'knRequestsLoaded'
}
var KnStatuses = {
    requestSent: {
        id: "requestSent",
        name: 'Request sent',
        priority: 0,
        tpl: /Sehr geehrte Betreuungsperson, wir haben Ihre Anfrage (\S*) (?:.*) die Einrichtung (.*) und das Kind (?:.*) erhalten./i
    },
    requestRefused: {
        id: "requestRefused",
        name: 'Declined',
        priority: 1,
        tpl: /Sehr geehrte Betreuungsperson, leider m(?:.*)ssen wir die von Ihnen gestellte Anfrage (\S*) (?:.*) die Einrichtung (.*) und das Kind (?:.*) ablehnen. Ablehnungsgrund: (.*)/i
    },
    waitList: {
        id: "waitList",
        name: 'Wait List',
        priority: 2,
        tpl: /Sehr geehrte Betreuungsperson, wir haben Ihre Anfrage (\S*) (?:.*) die Einrichtung (.*) und das Kind (?:.*) auf die Warteliste (?:.+)bernommen und werden diese bei der Planung der Kitaplatzvergabe ber(?:.+)cksichtigen./i
    },

    fromId(id) {
        return KnStatuses[id] || false;
    },
    hasStatus(id) {
        return !!KnStatuses[id];
    }
}

var KnStorage = {
    processRequests(results) {
        var requests = results.requests;
        var t = document.getElementById(KnSettingsConstants.TABLE_ID);
        while (t.hasChildNodes()) {
            t.removeChild(t.firstChild);
        }
        requests.forEach((request) => {
            var row = t.insertRow();
            var leftCell = row.insertCell();
            var rightCell = row.insertCell();
            leftCell.innerText = `Kita: ${request.kitaName}\nRequestID: ${request.id}`;
            for (var requestProp in request) {
                if (KnStatuses.hasStatus(requestProp)) {
                    var statusName = KnStatuses.fromId(requestProp).name;
                    var line = `${statusName} : ${request[requestProp]}`
                    rightCell.innerText = !!rightCell.innerText ?
                        `${rightCell.innerText}\n\n${line}` : line;
                }
            }
        });
    },

    parseCurrentStorage() {
        var requests = [];
        var i = 0;
        for (var key in localStorage) {
            console && console.log(key);
            var request = JSON.parse(localStorage[key]);
            console && console.log('found saved request', request);
            request.id = key;
            requests.push(request);
            i++;
            if (i >= localStorage.length) {
                break;
            }
        }
        return { requests };
    }
};

var KnList = {
    getMessageList() {
        chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
            var tab = tabs[0];
            if (tab) {
                var script = `
                var links = [];
                (document.querySelectorAll('a.gg-servicelink') || []).forEach(function(link) {
                    links.push(link.href);
                });
                { links: links }`;
                chrome.tabs.executeScript(tab.tabId, { code: script },
                    KnList.processMessageList);
            }
        });
    },

    processMessageList(results) {
        localStorage.clear();
        var links = results && results.length ? results[0] : [];
        const statusLabel = document.getElementById('knStatusLabel');
        var processedCount = 0;
        links.forEach((link, i) => {
            console && console.log(link);
            statusLabel.innerText = `Processing message ${i} out of ${links.length}...`;
            KnList.processOneMessage(link, () => {
                statusLabel.innerText = `Processed message ${i} out of ${links.length}...`;
                console && console.log('callback called', i, processedCount);
                processedCount++;
                if (processedCount >= links.length) {
                    statusLabel.innerText = `All processed!`;
                    const requests = KnStorage.parseCurrentStorage();
                    KnStorage.processRequests(requests);
                }
            });
        });
    },

    processOneMessage(link, callback) {
        const rx = /<span id="GatewayMaster_ContentSection_lblEingangstext" class="fv-text">(.*)<\/span>/;
        fetch(link).then(response => {
            response.text().then(text => {
                if (rx.test(text)) {
                    var groups = rx.exec(text);
                    if (groups && groups.length) {
                        const message = groups[1];
                        if (!!message) {
                            console && console.log('parsing message', message);
                            KnList.parseAllPossible(message);
                            callback.call(this);
                        }
                    }
                } else {
                    console && console.log('text element not found in fetched page', link);
                }
            });
        });
    },

    parseAllPossible(text) {
        this.parseRequestSentNotification(text);
        this.parseRefusedNotification(text);
        this.parseWaitListNotification(text);
    },

    parseRequestSentNotification(text) {
        this.parseMessage(text, KnStatuses.requestSent.tpl, KnStatuses.requestSent.id);
    },

    parseRefusedNotification(text) {
        this.parseMessage(text, KnStatuses.requestRefused.tpl, KnStatuses.requestRefused.id);
    },

    parseWaitListNotification(text) {
        this.parseMessage(text, KnStatuses.waitList.tpl, KnStatuses.waitList.id);
    },

    parseMessage(text, tpl, messageType) {
        var rx = tpl;
        if (rx.test(text)) {
            console && console.log('Found element of type ${messageType}');
            var result = rx.exec(text);
            if (result && result.length > 1) {
                var reqId = result[1];
                var kitaName = result[2];
                var reqIdStr = `${reqId}`;
                console && console.log(localStorage.getItem(reqIdStr));
                var item = JSON.parse(localStorage.getItem(reqIdStr) || '{}');
                console && console.log('item found', item);
                item.kitaName = kitaName;
                console && console.log('message type', messageType);
                item[messageType] = text;
                console && console.log('item to save', item);
                localStorage.setItem(reqIdStr, JSON.stringify(item));
            }
        } else {
            console && console.log('Not parsed', text);
        }
    }

};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('refreshTable').addEventListener('click', KnStorage.parseCurrentStorage);
    document.getElementById('processMessageList').addEventListener('click', KnList.getMessageList);
    // KnStorage.parseCurrentStorage();
});