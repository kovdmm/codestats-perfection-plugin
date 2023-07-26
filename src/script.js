(() => {
    const PANEL_CLASS_NAME = "kovdmm-panel";
    const BAR_CLASS_NAME = "kovdmm-bar";
    const BOOKMARKS_CLASS_NAME = "kovdmm-bookmarks";
    const BAR_BUTTONS_CLASS_NAME = "kovdmm-bar-buttons";
    const PILL_CLASS_NAME = "kovdmm-pill";
    const PILL_BUTTON_CLASS_NAME = "kovdmm-pill-button";
    const PILL_DELETE_CLASS_NAME = "kovdmm-pill-delete";
    const USERNAMES_STORAGE_KEY = BOOKMARKS_CLASS_NAME;
    const LEVEL_INDICATOR_SELECTOR = ".level-text";
    const DAY_MULTIPLAYER = 24 * 60 * 60 * 1000;
    const ADD_BOOKMARK_LABEL = "➕"; // "★", "☆"
    const DELETE_BOOKMARK_LABEL = "✕";

    const onload = async () => {
        if (find("#header-logo")) {
            renderBar();
        }

        if (location.pathname.startsWith("/users/")) {
            await renderPanel();
            fetchCalculateRefreshPanelData();
            observeTextContent(LEVEL_INDICATOR_SELECTOR, fetchCalculateRefreshPanelData);
        }
    };

    const renderBar = () => {
        const barElement = div();
        barElement.className = BAR_CLASS_NAME;

        const bookmarksElement = div();
        bookmarksElement.className = BOOKMARKS_CLASS_NAME;
        barElement.appendChild(bookmarksElement);

        const buttonsElement = div();
        buttonsElement.className = BAR_BUTTONS_CLASS_NAME;
        barElement.appendChild(buttonsElement);

        if (location.pathname.startsWith("/users/")) {
            const addBookmarkButtonElement = div();
            addBookmarkButtonElement.textContent = ADD_BOOKMARK_LABEL;
            addBookmarkButtonElement.className = `${PILL_CLASS_NAME} ${PILL_BUTTON_CLASS_NAME}`;
            addBookmarkButtonElement.addEventListener("click", handleBookmarkAdd);
            buttonsElement.appendChild(addBookmarkButtonElement);
        }

        document.body.prepend(barElement);

        refreshBookmarks(getUsernames());
    };

    const refreshBookmarks = (usernames) => {
        const bookmarksElement = find(`.${BOOKMARKS_CLASS_NAME}`);
        bookmarksElement.innerHTML = "";
        if (usernames?.length) {
            usernames.map(createBookmark).forEach(bookmarksElement.appendChild.bind(bookmarksElement));
        } else {
            bookmarksElement.innerHTML = `Bookmark users to this bar <b>by clicking ${ADD_BOOKMARK_LABEL} button</b> there →`;
        }
    };

    const createBookmark = (username) => {
        const pillElement = link();
        pillElement.href = `/users/${username}`;
        pillElement.className = PILL_CLASS_NAME;
        pillElement.innerHTML = `${avatar(username)} ${username}`;
        const deleteButton = div();
        deleteButton.className = PILL_DELETE_CLASS_NAME;
        deleteButton.textContent = DELETE_BOOKMARK_LABEL;
        deleteButton.addEventListener("click", (event) => handleBookmarkDelete(event, username));
        pillElement.appendChild(deleteButton);
        return pillElement;
    };

    const handleBookmarkAdd = () => {
        const username = getUsername();
        const usernames = getUsernames();
        if (!usernames.includes(username)) {
            usernames.push(username);
            storeUsernames(usernames);
            refreshBookmarks(usernames);
        }
    };

    const handleBookmarkDelete = (event, deleteUsername) => {
        event.preventDefault();
        event.stopPropagation();
        const usernames = getUsernames().filter((username) => username != deleteUsername);
        storeUsernames(usernames);
        refreshBookmarks(usernames);
    };

    // STATS
        let element = find(selector);
        if (!element) {
            return;
        }

        let cachedValue = element.innerText;
    const observeTextContent = (selector, handler, ms = 1000) => {
        const observer = () => {
            element = find(selector);
            if (element.textContent !== cachedValue) {
                handler(element, cachedValue, element.textContent);
                cachedValue = element.textContent;
            }
            setTimeout(observer, ms);
        };
        observer();
    };

    const fetchCalculateRefreshPanelData = async () => {
        const fromApi = await getXpsFromApi();
        const calculated = calculate(fromApi.todayXp);

        refreshPanelData({ ...fromApi, ...calculated });
    };

    const calculate = (todayXp) => {
        const tds = [...findAll(".year-xps table tbody td:not(.month-td)")];
        const xps = tds.map((td) => getXpFromTitle(td.title));
        const dayIndex = getDayOfTheYear366() - 1;

        const maxXp = xps.length ? Math.max(...xps) : 0;
        const thisDayXp = xps[dayIndex] || 0;
        const remainsXp = maxXp - thisDayXp;
        const remainsXpSinceDayStart = maxXp - thisDayXp + todayXp;

        return { remainsXp, thisDayXp, maxXp, remainsXpSinceDayStart };
    };

    const getXpsFromApi = async () => {
        const response = await fetch(location.href.replace("/users/", "/api/users/"));
        const responseBody = await response.json();
        const todayIsoStr = iso(new Date());
        const todayXp = responseBody.dates[todayIsoStr] || 0;
        const last12HoursXp = responseBody.new_xp;
        const lastTwoWeeksXp = getXpForLastNDays(responseBody.dates, 14);
        const totalDays = Object.keys(responseBody.dates)?.length || 1;
        const averageXp = Math.round(responseBody.total_xp / totalDays);

        return { todayXp, last12HoursXp, lastTwoWeeksXp, averageXp };
    };

    const renderPanel = async () => {
        const mainElement = find("body main");
        if (!mainElement) {
            return await renderPanel();
        }
        const panelElement = div();
        panelElement.className = `${PANEL_CLASS_NAME} stripe`;
        const panelInnerContainer = div();
        arr(8).map(div).forEach(panelInnerContainer.appendChild.bind(panelInnerContainer));
        panelElement.appendChild(panelInnerContainer);
        mainElement.prepend(panelElement);
    };

    const refreshPanelData = ({ remainsXp, thisDayXp, maxXp, todayXp, last12HoursXp, lastTwoWeeksXp, averageXp, remainsXpSinceDayStart }) => {
        const productivity = last12HoursXp / averageXp || 0;
        const totalProgress = thisDayXp / maxXp || 0;
        const todayProgress = todayXp / remainsXpSinceDayStart || 0;
        const emojiStatus = getEmojiStatus(todayProgress);

        const panelElement = find(`.${PANEL_CLASS_NAME}`);
        panelElement.style.backgroundColor = rgb(255 - Math.round((255 - 56) * totalProgress));
        panelElement.style.color = rgb(Math.round(totalProgress) * 255);

        const panelSections = panelElement.children[0].children; // findAll(`.${PANEL_CLASS_NAME} div div`);
        panelSections[0].textContent = `Remains: ${xp(remainsXp)}`;
        panelSections[1].textContent = `Last 12 hours: ${plusXp(last12HoursXp)}`;
        panelSections[3].textContent = `Today: ${plusXp(todayXp)} (${percentage(todayProgress)}) ${emojiStatus}`;
        panelSections[4].textContent = `Total: ${en(thisDayXp)} of ${xp(maxXp)} (${percentage(totalProgress)})`;
        panelSections[6].textContent = `Productivity: ${percentage(productivity)}`;
        panelSections[7].textContent = `Last 14 days: ${xp(lastTwoWeeksXp)}`;
    };

    const getUsernames = () => JSON.parse(localStorage.getItem(USERNAMES_STORAGE_KEY) || "[]") || [];
    const storeUsernames = (usernames) => localStorage.setItem(USERNAMES_STORAGE_KEY, JSON.stringify(usernames));
    const getUsername = () => location.pathname.match("/users/([a-zA-Z0-9_.]+)")[1];
    const getEmojiStatus = (ratio) => (ratio ? "🔥".repeat(((ratio - 0.15) / 0.2 + 1) | 0) || "🙄" : "😐");
    const getXpFromTitle = (t) => parseInt(t.match(/([\d,]+) XP/)[1].replace(/,/g, ""), 10);
    const getDayOfTheYear366 = (date = new Date()) => getDayOfTheYear(new Date(date.setFullYear(2e3)));
    const getXpForLastNDays = (datesObject, days) => isoDatesRange(days).reduce((sum, date) => sum + (datesObject[date] || 0), 0);
    const isoDatesRange = (days) => arr(days).map((_, d) => iso(getDateWithDayOffset(-d)));
    const percentage = (value) => `${+(value * 100).toFixed(2)}%`;
    const getDateWithDayOffset = (addDays = 0) => new Date(Date.now() + addDays * DAY_MULTIPLAYER);
    const getDayOfTheYear = (date = new Date()) => ((date - new Date(date.getFullYear(), 0, 0)) / DAY_MULTIPLAYER) | 0;
    const arr = (length) => Array.from({ length });
    const rgb = (num) => `rgb(${num}, ${num}, ${num})`;
    const plusXp = (num) => `${plus(num) + xp(num)}`;
    const plus = (num) => (num > 0 ? "+" : "");
    const xp = (num) => `${en(num)} XP`;
    const en = (obj) => obj.toLocaleString("en-US");
    const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const pad = (num, length = 2, fill = "0") => num.toString().padStart(length, fill);
    const find = (selector) => document.querySelector(selector);
    const findAll = (selector) => document.querySelectorAll(selector);
    const div = () => document.createElement("div");
    const link = () => document.createElement("a");
    const avatar = (username) => `<img src="/users/${username}/avatar" alt="${username}'s avatar" />`;

    // execution
    console.log("Perfection Plugin {{VERSION}}");
    window.onload = onload;
})();
