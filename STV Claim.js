// ==UserScript==
// @name         STV Claim (Optimized UTC+7) - Fixed Fetch
// @namespace    http://tampermonkey.net/
// @version      2025-06-02.9
// @description  Tự động nhặt đồ, gộp chung Công Pháp (type 3) và Võ Kỹ (type 4), sửa lỗi JSON và Fetch
// @author       Ambrose Schulz
// @match        *://sangtacviet.app/truyen/*/1/*/*/
// @match        *://*.sangtacviet.app/truyen/*/1/*/*/
// @match        *://sangtacviet.vip/truyen/*/1/*/*/
// @match        *://*.sangtacviet.vip/truyen/*/1/*/*/
// @match        *://sangtacviet.com/truyen/*/1/*/*/
// @match        *://*.sangtacviet.com/truyen/*/1/*/*/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sangtacviet.app
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* =================== CSS INJECTION =================== */
    const style = document.createElement('style');
    style.innerHTML = `
        .tippy-content, .tooltip-inner, [id^="popup-info"], .item-info { 
            white-space: pre-line !important; 
        }
    `;
    document.head.appendChild(style);

    /* =================== UTILITY FUNCTIONS =================== */
    const saveSetting = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const getSetting = (key) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
    };

    const saveItem = (name, type) => {
        const safeName = name ? String(name) : "Vật phẩm ẩn/Lỗi tên";
        const items = JSON.parse(localStorage.getItem("collectedItems")) || [];
        const timestamp = Date.now();
        const index = items.findIndex(item => item.name === safeName);

        if (index !== -1) {
            items[index].timestamp = timestamp;
            items[index].count = (items[index].count || 1) + 1;
            if (type) items[index].type = type;
        } else {
            items.push({ name: safeName, timestamp, count: 1, type: type });
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
        settingBtn.innerText = "⚙️";
        Object.assign(settingBtn.style, {
            position: "fixed", bottom: "70px", left: "0px", padding: "10px",
            background: currentSetting ? "#28a745" : "#dc3545", color: "#fff",
            border: "none", cursor: "pointer", borderRadius: "5px"
        });
        settingBtn.onclick = () => {
            const newSetting = !(getSetting("autoReload") || false);
            saveSetting("autoReload", newSetting);
            document.getElementById('settingBtn').style.background = newSetting ? "#28a745" : "#dc3545";
            showToast("Chế độ tự động reload: " + (newSetting ? "BẬT" : "TẮT"));
        };
        document.body.appendChild(settingBtn);
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
        const items = JSON.parse(localStorage.getItem("collectedItems") || "[]");
        if (items.length === 0) return alert("Không có vật phẩm nào!");

        const grouped = items.reduce((acc, curr) => {
            let key = (curr && curr.name) ? String(curr.name) : "Vật phẩm ẩn/Lỗi tên";
            if (curr.type == 3) key = "Công Pháp (Các loại)";
            else if (curr.type == 4) key = "Võ Kỹ (Các loại)";
            else {
                if (key.includes("Đan")) key = "Đan dược";
                else if (["Kiếm Pháp", "Chưởng", "vũ kỹ", "Thân pháp", "Cước", "Đao"].some(k => key.toLowerCase().includes(k.toLowerCase()))) key = "Võ Kỹ (Các loại)";
                else if (["Tàn quyển", "thần công", "bí kỹ", "bí pháp", "Luyện thể", "Quyết", "Điển", "Công Pháp", "Tâm Pháp"].some(k => key.toLowerCase().includes(k.toLowerCase()))) key = "Công Pháp (Các loại)";
                else if (key.includes("Linh Thạch")) key = "Linh Thạch";
                else if (key.includes("Pháp Tắc")) key = "Pháp Tắc";
            }
            if (!acc[key]) acc[key] = { count: 0, lastTimestamp: 0 };
            acc[key].count += (curr.count || 1);
            if (curr.timestamp > acc[key].lastTimestamp) acc[key].lastTimestamp = curr.timestamp;
            return acc;
        }, {});

        const sortedItems = Object.keys(grouped)
            .map(name => ({ name, count: grouped[name].count, lastTimestamp: grouped[name].lastTimestamp }))
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

        let listDiv = document.getElementById("itemList") || document.createElement("div");
        listDiv.id = "itemList";
        Object.assign(listDiv.style, {
            position: "fixed", bottom: "60px", left: "20px", padding: "10px", background: "#fff",
            border: "1px solid #ddd", boxShadow: "0px 2px 6px rgba(0,0,0,0.2)", borderRadius: "5px",
            width: "400px", maxHeight: "700px", overflowY: "auto", zIndex: 10000, display: "block"
        });

        listDiv.innerHTML = "<strong>Danh sách vật phẩm:</strong>\n";
        sortedItems.forEach((item, index) => {
            const timeStr = new Date(item.lastTimestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
            listDiv.innerHTML += `<p>${index + 1}. ${item.name} (x${item.count}) - Gần nhất: ${timeStr}</p>`;
        });

        const btnStyle = { marginTop: "10px", padding: "5px", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" };

        const clearBtn = document.createElement("button");
        clearBtn.innerText = "🗑 Xóa danh sách";
        Object.assign(clearBtn.style, btnStyle, { background: "#dc3545" });
        clearBtn.onclick = () => { localStorage.removeItem("collectedItems"); listDiv.remove(); alert("Đã xóa!"); };

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "❌ Đóng";
        Object.assign(closeBtn.style, btnStyle, { background: "#6c757d", marginLeft: "5px" });
        closeBtn.onclick = () => listDiv.style.display = "none";

        listDiv.append(clearBtn, closeBtn);
        document.body.appendChild(listDiv);
    }

    /* =================== NETWORK (FIXED WITH FETCH) =================== */
    const sendFormData = async (url, formData) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                credentials: 'include' // Đã sửa lỗi "init" thành "include" tại đây
            });
            const text = await response.text();
            if (!text || text.trim() === "" || text === "undefined") {
                return { code: 0, msg: "Empty response" };
            }
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        } catch (error) {
            console.error("Fetch error:", error);
            return null;
        }
    };

    /* =================== MAIN LOGIC =================== */
    const pollForItems = async () => {
        try {
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

                let finalName = item.name ? item.name.replace(/<[^>]*>/g, '').trim() : '';
                let rawInfo = item.info ? item.info.replace(/<[^>]*>/g, '').trim() : '';
                let finalInfo = rawInfo.replace(/^.*?(Tăng\s*\d+%.*)$/is, '$1');

                if (item.type == 3 || item.type == 4) {
                    if (finalName.indexOf('Công Pháp') >= 0) {
                        finalName = 'Vĩnh Hằng Ma Thiên Lục';
                        finalInfo = `Ma thiên nhất lục trấn huyền tông,
Quán cổ thông kim khí tự long.
Huyết dẫn hoàng tuyền khai tuệ mạch,
Hồn quy thái cực luyện thần phong.
Tâm dung vạn tượng phi sinh diệt,
Thức phá thiên ma ngộ sắc không.
Bất diệt bất sinh hà vấn đạo,
Vĩnh Hằng nguyên tại ngã tâm trung.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Tàn quyển') >= 0) {
                        finalName = 'Vĩnh Hằng Chân Đồ';
                        finalInfo = `Cửu thiên rớt xuống nửa trang thư,
Nét chữ mờ phai, lửa tận hư.
Một góc xiêm y còn đọng khí,
Ba dòng tâm pháp đã tiêu từ.
Kẻ tu lạc lối tìm chân tướng,
Người ngộ thương cung lạc cõi bờ.
Nếu hỏi Vĩnh Hằng sao khuyết bóng,
Tàn chương vô tự mới là mơ.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Công kích vũ kỹ') >= 0) {
                        finalName = 'Phá Thiên Cửu Thức Thương';
                        finalInfo = `Nhất thương phá giới động càn khôn
Cửu thức liên hoàn diệt quỷ hồn
Thế tự lưu tinh xuyên vạn vật
Khí như lôi điện chấn thiên môn
Phong vân tụ hội thân như ảnh
Nhật nguyệt luân hồi huyết hóa tồn
Sát khí trùng thiên kinh vạn cổ
Đồ long diệt thánh lập uy tôn\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Công kích bí kỹ') >= 0) {
                        finalName = 'Xạ Nhật Thần Cung';
                        finalInfo = `Thần cung huyết huyễn quán hằng tinh
Nhất tiễn xuyên phá cửu trùng minh
Vãn nguyệt vi dực xuyên thiên giới
Dẫn tâm vi diễm phần quỷ thành
Huyền nhất thanh thiên địa động
Trùng quang thiểm thước nhật hà kinh
Vô hình tiễn khí khu sinh tử
Duy lưu thiên nam đại bàng hình.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Thân pháp') >= 0) {
                        finalName = 'Huyễn Ảnh Thần Tung';
                        finalInfo = `Vạn lý trường đồ vạn lý trần
Thân như ảnh mạc huyễn nhân
Phong vân tùy ý thi triển diệu
Bá giả phiêu dao nhập khách trần.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Tinh thần bí pháp') >= 0) {
                        finalName = 'Nhiếp Hư Thần Niệm';
                        finalInfo = `Thần du thái hư phá mê tân
Tróc nguyệt vu thiên, cầm quỷ thần
Nhất niệm vô thanh tham cửu u
Thiên tâm hữu ảnh chiếu mê tâm
Hư không đạp lãng tầm chân ngã
Vũ trụ tuần hoàn định phách linh
Thùy vị thần niệm vô sát lực
Vị tằng tiếp xứ vô biên minh.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Luyện thể thần công') >= 0) {
                        finalName = 'Thần Tượng Kinh';
                        finalInfo = `Đại Tượng Vô Hình Tượng Thiên Tượng
Chân Tượng Vô Tâm Tượng Tượng Nguyên\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Luyện thể công pháp') >= 0) {
                        finalName = 'Linh Cốt Luyện Thể Pháp';
                        finalInfo = `Thân thể dĩ Linh khí luyện hóa
Cốt cách dĩ Linh khí ma luyện
Toàn thân linh lực cuồn cuộn, 
Bách khiếu linh khí thông suốt, 
Tâm thần hằng định, 
Mệnh mạch trường tồn, 
Cửu khiếu linh thông, 
Bách mạch thông lưu, 
Bách mạch linh thông.\n\n` + finalInfo;
                    }
                    else if (finalName.indexOf('Phòng ngự vũ kỹ') >= 0) {
                        finalName = 'Thiên Cương Hộ Thể Thuẫn';
                        finalInfo = `Thiên Cương mười tám trận,
Hỗn Độn sáu mươi bốn thế. 
Dịch chuyển bốn phương là "Thiên"
Khí phách tung hoành là "Cương"
Nhất khí hóa tam thanh, tam thanh sinh vạn vật
Ngũ hành tương sinh, tương khắc
Kình lực tuần hoàn, vô cùng vô tận
Cương khí nương theo thân pháp, uy vũ vô song\n\n` + finalInfo;
                    }
                }

                if (!finalName) finalName = "Vật phẩm vô danh";
                claimData.append("newname", finalName);
                claimData.append("newinfo", finalInfo);

                const fcollect = await new Promise(resolve => setTimeout(() => {
                    sendFormData(url + "?ngmar=fcl", claimData).then(resolve).catch(() => resolve(null));
                }, 1000));

                if (fcollect && fcollect.code && fcollect.code === 1) {
                    saveItem(finalName, item.type);
                    showToast("Đã nhặt thành công: " + finalName);
                } else {
                    showToast(fcollect?.err || "Lỗi nhặt vật phẩm!");
                    if (getSetting("autoReload")) setTimeout(() => location.reload(), 3000);
                }
            }
        }
        catch (e) { console.error("Script Error:", e); }

        const button = document.querySelector('.btn.btn-info');
        if (button && button.innerText === "Nhặt bảo") button.remove();
    };

    /* =================== INIT =================== */
    createShowButton();
    createSettingButton();
    setInterval(pollForItems, 30000);

})();
