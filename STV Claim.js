// ==UserScript==
// @name         STV Claim
// @namespace    http://tampermonkey.net/
// @version      2025-06-02
// @description  Gửi POST request với FormData, hiển thị vật phẩm theo múi giờ Việt Nam (UTC+7)
// @author       Ambrose Schulz
// @match        https://sangtacviet.app/truyen/*/1/*/*/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sangtacviet.app
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    /* =================== UTILITY FUNCTIONS =================== */

    const saveSetting = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getSetting = (key) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
    };

    const saveItem = (name) => {
        const items = JSON.parse(localStorage.getItem("collectedItems")) || [];
        const timestamp = Date.now();
        const index = items.findIndex(item => item.name === name);

        if (index !== -1) {
            items[index].timestamp = timestamp;
            items[index].count = (items[index].count || 1) + 1;
        } else {
            items.push({ name, timestamp, count: 1 });
        }
        localStorage.setItem("collectedItems", JSON.stringify(items));
    };

    const showToast = (message) => {
        let toastContainer = document.getElementById('tm-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'tm-toast-container';
            Object.assign(toastContainer.style, { position: 'fixed', top: '20px', right: '20px', zIndex: 9999 });
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.innerText = message;
        Object.assign(toast.style, {
            background: '#28a745', color: '#fff', padding: '10px 15px', marginTop: '10px',
            borderRadius: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', opacity: '1',
            transition: 'opacity 0.5s ease'
        });
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    /* =================== UI BUTTONS =================== */

    const createSettingButton = () => {
        const currentSetting = getSetting("autoReload");
        const settingBtn = document.createElement("button");
        settingBtn.id = "settingBtn";

        // Chỉ hiển thị icon, không hiện chữ BẬT/TẮT
        settingBtn.innerText = "⚙️";

        Object.assign(settingBtn.style, {
            position: "fixed",
            bottom: "70px",
            left: "0px",
            padding: "10px",
            // Xanh lá (#28a745) nếu Bật, Đỏ (#dc3545) nếu Tắt
            background: currentSetting ? "#28a745" : "#dc3545",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px"
        });

        settingBtn.onclick = toggleAutoReload;
        document.body.appendChild(settingBtn);
    };

    const toggleAutoReload = () => {
        const currentSetting = getSetting("autoReload") || false;
        const newSetting = !currentSetting;
        saveSetting("autoReload", newSetting);

        const settingBtn = document.getElementById('settingBtn');
        if (settingBtn) {
            // Cập nhật màu sắc theo trạng thái mới
            settingBtn.style.background = newSetting ? "#28a745" : "#dc3545";
        }

        showToast("Chế độ tự động reload khi lỗi: " + (newSetting ? "BẬT" : "TẮT"));
    };

    const createShowButton = () => {
        const showBtn = document.createElement("button");
        showBtn.innerText = "🗃";
        Object.assign(showBtn.style, {
            position: "fixed", bottom: "20px", left: "0px", padding: "10px",
            background: "#007bff", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px"
        });
        showBtn.onclick = showItemList;
        document.body.appendChild(showBtn);
    };

    function showItemList() {
        const rawData = localStorage.getItem("collectedItems");
        const items = rawData ? JSON.parse(rawData) : [];
        if (items.length === 0) {
            alert("Không có vật phẩm nào!");
            return;
        }

        const grouped = items.reduce((acc, curr) => {
            let key = curr.name;
            if (key.includes("Đan")) key = "Đan dược";
            else if (["Tàn quyển", "thần công", "Thân pháp", "bí kỹ", "vũ kỹ"].some(k => key.includes(k))) key = "Võ kỹ";
            else if (key.includes("Linh Thạch")) key = "Linh Thạch";
            else if (key.includes("Pháp Tắc")) key = "Pháp Tắc";

            if (!acc[key]) acc[key] = { count: 0, lastTimestamp: 0 };
            acc[key].count += (curr.count || 1);
            if (curr.timestamp > acc[key].lastTimestamp) acc[key].lastTimestamp = curr.timestamp;
            return acc;
        }, {});

        const sortedItems = Object.keys(grouped)
            .map(name => ({ name, count: grouped[name].count, lastTimestamp: grouped[name].lastTimestamp }))
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

        let listDiv = document.getElementById("itemList");
        if (listDiv) listDiv.remove();

        listDiv = document.createElement("div");
        listDiv.id = "itemList";
        Object.assign(listDiv.style, {
            position: "fixed", bottom: "60px", left: "20px", padding: "10px", background: "#fff",
            border: "1px solid #ddd", boxShadow: "0px 2px 6px rgba(0,0,0,0.2)", borderRadius: "5px",
            width: "400px", maxHeight: "700px", overflowY: "auto", zIndex: 10000
        });
        document.body.appendChild(listDiv);

        listDiv.innerHTML = "<strong>Danh sách vật phẩm:</strong><br>";
        sortedItems.forEach((item, index) => {
            const timeStr = new Date(item.lastTimestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
            listDiv.innerHTML += `<p>${index + 1}. ${item.name} (x${item.count}) - Gần nhất: ${timeStr}</p>`;
        });

        const clearBtn = document.createElement("button");
        clearBtn.innerText = "🗑 Xóa danh sách";
        Object.assign(clearBtn.style, { marginTop: "10px", padding: "5px", background: "#dc3545", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" });
        clearBtn.onclick = clearItemList;

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "❌ Đóng";
        Object.assign(closeBtn.style, { marginTop: "10px", marginLeft: "5px", padding: "5px", background: "#6c757d", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" });
        closeBtn.onclick = () => { listDiv.style.display = "none"; };

        listDiv.appendChild(clearBtn);
        listDiv.appendChild(closeBtn);
        listDiv.style.display = "block";
    }

    const clearItemList = () => {
        localStorage.removeItem("collectedItems");
        const listDiv = document.getElementById("itemList");
        if (listDiv) listDiv.remove();
        alert("Đã xóa danh sách vật phẩm!");
    };

    /* =================== NETWORK =================== */

    const sendFormData = (url, formData) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST", url: url, data: formData,
                onload: (response) => {
                    try { resolve(JSON.parse(response.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: (error) => { reject(error); }
            });
        });
    };

    /* =================== MAIN LOGIC =================== */

    const pollForItems = async () => {
        const checkData = new FormData();
        checkData.append("ngmar", "tcollect");
        checkData.append("ajax", "trycollect");
        checkData.append("iscollectable", "iscollectable");
        const targetUrl = window.location.origin + "/index.php?ngmar=iscollectable";

        try {
            const check = await sendFormData(targetUrl, checkData);
            if (check.code && check.code === 1) {
                const url = window.location.origin + "/index.php";
                const itemData = new FormData();
                itemData.append("ngmar", "collect");
                itemData.append("ajax", "collect");

                const item = await new Promise(resolve => setTimeout(() => {
                    sendFormData(url, itemData).then(resolve).catch(() => resolve(null));
                }, 1000));

                if (item && item.type) {
                    const claimData = new FormData();
                    const lastStr = window.location.href.replace(/\/$/, "").split("/").pop();
                    claimData.append("ajax", "fcollect");
                    claimData.append("c", lastStr);
                    if (item.type === 3 || item.type === 4) {
                        claimData.append("newname", item.name.replace(/<[^>]*>/g, ''));
                        claimData.append("newinfo", item.info);
                    }
                    const fcollect = await new Promise(resolve => setTimeout(() => {
                        sendFormData(url + "?ngmar=fcl", claimData).then(resolve).catch(() => resolve(null));
                    }, 1000));

                    if (fcollect && fcollect.code && fcollect.code === 1) {
                        saveItem(item.name);
                        showToast("Bạn đã nhận được " + item.name);
                    } else {
                        showToast("Lỗi nhặt vật phẩm!");
                        if (getSetting("autoReload")) setTimeout(() => location.reload(), 3000);
                    }
                } else {
                    showToast("Lỗi lấy thông tin vật phẩm!");
                    if (getSetting("autoReload")) setTimeout(() => location.reload(), 3000);
                }
            } else {
                showToast("Không có đồ nhặt!");
            }
        } catch (e) { console.error(e); }

        const button = document.querySelector('.btn.btn-info');
        if (button && button.innerText === "Nhặt bảo") button.remove();
    };

    /* =================== INIT =================== */
    createShowButton();
    createSettingButton();
    setInterval(pollForItems, 30000);

})();
