var KnSettingsConstants = {
    TABLE_ID: 'knRequestsTable',
    STATS_TABLE_ID: 'statsTable',
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
    getSavedRequest(reqId) {
        const saved = localStorage.getItem('requests');
        const requests = !!saved ? JSON.parse(saved) : {};
        return requests[reqId];
    },

    isLinkSaved(link) {
        const saved = localStorage.getItem('processedLinks');
        const links = !!saved ? JSON.parse(saved) : [];
        return links.indexOf(link) >= 0;
    },

    saveRequest(reqId, item) {
        const saved = localStorage.getItem('requests');
        const requests = !!saved ? JSON.parse(saved) : {};
        requests[reqId] = item;
        localStorage.setItem('requests', JSON.stringify(requests));
    },

    saveLink(link) {
        if (!KnStorage.isLinkSaved(link)) {
            const saved = localStorage.getItem('processedLinks');
            const links = !!saved ? JSON.parse(saved) : [];
            links.push(link);
            localStorage.setItem('processedLinks', JSON.stringify(links));
        }
    },

    countLinks() {
        const saved = localStorage.getItem('processedLinks');
        const links = !!saved ? JSON.parse(saved) : [];
        return links.length;
    },

    checkFilter(request, statusId) {
        switch (statusId) {
            case KnStatuses.requestRefused.id:
            case KnStatuses.waitList.id:
                return !!request[statusId];
                break;
            case KnStatuses.requestSent.id:
                // unanswered ONLY
                return !request[KnStatuses.requestRefused.id] &&
                    !request[KnStatuses.waitList.id] &&
                    !!request[statusId];
                break;
        }
        return false;
    },

    parseCurrentStorage() {
        var requests = [];
        var saved = JSON.parse(localStorage.getItem('requests') || '{}');
        for (const key in saved) {
            console && console.log(key);
            const request = saved[key];
            console && console.log('found saved request', request);
            request.id = key;
            requests.push(request);
        }
        var t = document.getElementById(KnSettingsConstants.TABLE_ID);
        while (t.hasChildNodes()) {
            t.removeChild(t.firstChild);
        }
        var filter = KnStorage.getCurrentFilter();
        requests.sort((r1, r2) => (r1.kitaName.localeCompare(r2.kitaName)))
            .filter(r => !filter || KnStorage.checkFilter(r, filter))
            .forEach((request, index) => {
                var row = t.insertRow();
                if (!!request[KnStatuses.requestRefused.id]) {
                    row.className = 'declined';
                } else if (!!request[KnStatuses.waitList.id]) {
                    row.className = 'waitlisted';
                } else if (!!request[KnStatuses.requestSent.id]) {
                    row.className = 'unanswered';
                }
                var leftCell = row.insertCell();
                var middleCell = row.insertCell();
                var rightCell = row.insertCell();
                leftCell.innerText = `${index + 1}`;
                middleCell.innerText = `Kita: ${request.kitaName}\nRequestID: ${request.id}`;
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

    parseMessageGroups() {
        var requests = [];
        var saved = JSON.parse(localStorage.getItem('requests') || '{}');
        for (const key in saved) {
            console && console.log(key);
            const request = saved[key];
            console && console.log('found saved request', request);
            request.id = key;
            requests.push(request);
        }
        var t = document.getElementById(KnSettingsConstants.STATS_TABLE_ID);
        while (t.hasChildNodes()) {
            t.removeChild(t.firstChild);
        }
        var declinedCount = 0,
            declinedNames = [];
        var waitlistedCount = 0,
            waitlistedNames = [];
        var unansweredCount = 0,
            unansweredNames = [];
        var totalCount = requests.length,
            totalNames = requests.map(r => r.kitaName);

        requests.forEach((request, index) => {
            if (!!request[KnStatuses.requestRefused.id]) {
                declinedCount++;
                declinedNames.push(request.kitaName);
            } else if (!!request[KnStatuses.waitList.id]) {
                waitlistedCount++;
                waitlistedNames.push(request.kitaName);
            } else if (!!request[KnStatuses.requestSent.id]) {
                unansweredCount++;
                unansweredNames.push(request.kitaName);
            }
        });
        // declined
        var declinedRow = t.insertRow();
        declinedRow.className = 'declined';
        var leftCell = declinedRow.insertCell();
        var rightCell = declinedRow.insertCell();
        leftCell.innerText = `Declined requests: ${declinedCount}`;
        rightCell.innerText = `${declinedNames.sort().join('\n')}`;
        // waitlisted
        var waitlistedRow = t.insertRow();
        waitlistedRow.className = 'waitlisted';
        var leftCell = waitlistedRow.insertCell();
        var rightCell = waitlistedRow.insertCell();
        leftCell.innerText = `Waitlisted requests: ${waitlistedCount}`;
        rightCell.innerText = `${waitlistedNames.sort().join('\n')}`;
        // unanswered
        var unansweredRow = t.insertRow();
        unansweredRow.className = 'unanswered';
        var leftCell = unansweredRow.insertCell();
        var rightCell = unansweredRow.insertCell();
        leftCell.innerText = `Unanswered requests: ${unansweredCount}`;
        rightCell.innerText = `${unansweredNames.sort().join('\n')}`;
        // all
        var totalRow = t.insertRow();
        var leftCell = totalRow.insertCell();
        var rightCell = totalRow.insertCell();
        leftCell.innerText = `Total requests: ${totalCount}`;
        rightCell.innerText = `${totalNames.sort().join('\n')}`;
    },

    setCurrentFilter(id) {
        if (!!id) {
            localStorage.setItem('currentFilter', `${id}`);
        } else {
            localStorage.removeItem('currentFilter');
        }
        KnStorage.parseCurrentStorage();
    },

    getCurrentFilter() {
        return localStorage.getItem('currentFilter');
    }
};

var KnList = {
    refreshMessageList(processAll) {
        console && console.log('refresh');
        chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
            var tab = tabs[0];
            if (tab) {
                console && console.log('tab', tab);
                var script = `
                var links = [];
                (document.querySelectorAll('a.gg-servicelink') || []).forEach(function(link) {
                    links.push(link.href);
                });
                { links: links }`;
                chrome.tabs.executeScript(tab.tabId, { code: script },
                    (links) => KnList.processMessageList(links, processAll));
            }
        });
    },

    renderIfDone(links) {
        const statusLabel = document.getElementById('knStatusLabel');
        const processedCount = KnStorage.countLinks();
        if (processedCount >= links.length) {
            statusLabel.innerText = `All processed!`;
            KnStorage.parseCurrentStorage();
            KnStorage.parseMessageGroups();
        } else {
            console && console.log('Processed count', processedCount);
        }
    },

    processMessageList(results, processAll) {
        console && console.log('processMessageList', results, processAll);
        if (processAll) {
            localStorage.clear();
        }
        var links = results && results.length ? results[0] : [];
        const statusLabel = document.getElementById('knStatusLabel');
        links.forEach((link, i) => {
            statusLabel.innerText = `Processing message ${i} out of ${links.length}...`;
            if (processAll || !KnStorage.isLinkSaved(link)) {
                KnStorage.saveLink(link);
                console && console.log(link);
                KnList.processOneMessage(link, () => {
                    statusLabel.innerText = `Processed message ${i} out of ${links.length}...`;
                    KnList.renderIfDone(links);
                });
            } else {
                console && console.log('Skipping already processed message');
                KnList.renderIfDone(links);
            }
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
                var item = KnStorage.getSavedRequest(reqId) || {};
                console && console.log(item);
                console && console.log('item found', item);
                item.kitaName = kitaName;
                console && console.log('message type', messageType);
                item[messageType] = text;
                console && console.log('item to save', item);
                KnStorage.saveRequest(reqId, item);
            }
        } else {
            console && console.log(`Not parsed as type ${messageType}`, text);
        }
    }
};

var KnTabs = {
    openTab(evt, tabId) {
        // Declare all variables
        var i, tabcontent, tablinks;
        // Get all elements with class="tabcontent" and hide them
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(tabId).style.display = "block";
        evt.currentTarget.className += " active";
    },

    openDefaultTab() {
        document.getElementById("openAllTab").click();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('processMessageList').addEventListener('click', () => KnList.refreshMessageList(true));
    document.getElementById('openAllTab').addEventListener('click', (e) => { KnTabs.openTab(e, 'allMessages') });
    document.getElementById('openGroupsTab').addEventListener('click', (e) => { KnTabs.openTab(e, 'messageGroups') });
    // filters
    document.getElementById('showUnanswered').addEventListener('click', KnStorage.setCurrentFilter.bind(this, KnStatuses.requestSent.id));
    document.getElementById('showDeclined').addEventListener('click', KnStorage.setCurrentFilter.bind(this, KnStatuses.requestRefused.id));
    document.getElementById('showWaitlisted').addEventListener('click', KnStorage.setCurrentFilter.bind(this, KnStatuses.waitList.id));
    document.getElementById('showAll').addEventListener('click', KnStorage.setCurrentFilter.bind(this, null));

    KnTabs.openDefaultTab();
    KnList.refreshMessageList(false);
});