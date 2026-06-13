// ==========================================
// Chattool Core - Settings Separation
// ==========================================
// このファイルは chattool_new.html 専用です
// index.html の設定 (sr_comment_settings) とは完全に分離されます

(function () {
    'use strict';

    console.log('ChatTool Core: Initializing...');

    // ==========================================
    // 設定キー定義
    // ==========================================
    const CHATTOOL_STORAGE_KEY = 'sr_chattool_settings';
    const CHATTOOL_DEFAULT_SETTINGS = {
        size: 18,
        color: '#000000',
        muteEnabled: false,
        muteSymbol: '',
        defaultRoomId: '',
        giftMarkerDuration: 20,
        commentMarkerDuration: 10,
        chatDisplayMax: 50,
        giftThreshold: 0,
        footerMode: 'none' // none, show_event
    };

    // ==========================================
    // 設定読み込みのオーバーライド
    // ==========================================
    function loadChattoolSettings() {
        try {
            const saved = localStorage.getItem(CHATTOOL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log('ChatTool: Loaded settings from', CHATTOOL_STORAGE_KEY);
                return { ...CHATTOOL_DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.error('ChatTool: Failed to load settings:', e);
        }

        console.log('ChatTool: Using default settings');
        return { ...CHATTOOL_DEFAULT_SETTINGS };
    }

    // ==========================================
    // 設定保存のオーバーライド
    // ==========================================
    function saveChattoolSettings(settings) {
        try {
            localStorage.setItem(CHATTOOL_STORAGE_KEY, JSON.stringify(settings));
            console.log('ChatTool: Saved settings to', CHATTOOL_STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('ChatTool: Failed to save settings:', e);
            return false;
        }
    }

    // ==========================================
    // 既存の commentSettings をオーバーライド
    // ==========================================
    // DOMContentLoaded前に実行される可能性があるため、
    // グローバルスコープで即座に設定を読み込む
    window.commentSettings = loadChattoolSettings();

    // ==========================================
    // 保存ボタンのオーバーライド
    // ==========================================
    window.addEventListener('DOMContentLoaded', function () {
        console.log('ChatTool: DOM loaded, setting up save button override');

        // 元の保存ボタンを探す
        const saveBtn = document.getElementById('applyDisplaySettings');
        if (saveBtn) {
            // 既存のイベントリスナーを上書き
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

            newSaveBtn.addEventListener('click', function () {
                console.log('ChatTool: Save button clicked (overridden)');

                try {
                    // UIから設定を読み取る
                    const settings = { ...window.commentSettings };

                    const fontSize = document.getElementById('commentFontSize');
                    if (fontSize) settings.size = parseInt(fontSize.value);

                    const color = document.getElementById('commentColor');
                    if (color) settings.color = color.value;

                    const muteEnabled = document.getElementById('muteEnabledCheckbox');
                    if (muteEnabled) settings.muteEnabled = muteEnabled.checked;

                    const muteSymbol = document.getElementById('muteSymbolInput');
                    if (muteSymbol) settings.muteSymbol = muteSymbol.value.trim();

                    const defaultRoom = document.getElementById('defaultRoomIdInput');
                    if (defaultRoom) settings.defaultRoomId = defaultRoom.value.trim();

                    const giftMarker = document.getElementById('giftMarkerDurationInput');
                    if (giftMarker) settings.giftMarkerDuration = parseInt(giftMarker.value);

                    const commentMarker = document.getElementById('commentMarkerDurationInput');
                    if (commentMarker) settings.commentMarkerDuration = parseInt(commentMarker.value);

                    const giftThreshold = document.getElementById('giftThresholdInput');
                    if (giftThreshold) settings.giftThreshold = parseInt(giftThreshold.value);

                    // Footer Mode
                    const footerRadios = document.getElementsByName('footerDisplayMode');
                    for (const radio of footerRadios) {
                        if (radio.checked) {
                            settings.footerMode = radio.value;
                            break;
                        }
                    }

                    // グローバル設定を更新
                    window.commentSettings = settings;

                    // 保存（chattool専用キーに）
                    if (saveChattoolSettings(settings)) {
                        console.log('ChatTool: Settings saved successfully');

                        // UIに反映
                        const commentBox = document.getElementById('comment');
                        if (commentBox) {
                            commentBox.style.fontSize = settings.size + 'px';
                            commentBox.style.color = settings.color;
                        }

                        // Footer Mode適用
                        if (window.applyFooterMode) {
                            window.applyFooterMode();
                        }

                        // 設定パネルを閉じる
                        const panel = document.getElementById('settingsPanel');
                        if (panel) panel.style.display = 'none';
                    } else {
                        alert('設定の保存に失敗しました');
                    }
                } catch (e) {
                    console.error('ChatTool: Save error:', e);
                    alert('設定の保存中にエラーが発生しました: ' + e.message);
                }
            });

            console.log('ChatTool: Save button override complete');
        } else {
            console.warn('ChatTool: applyDisplaySettings button not found');
        }
    });

    // ==========================================
    // 初期化確認
    // ==========================================
    console.log('ChatTool Core: Loaded with settings:', window.commentSettings);
    console.log('ChatTool: Using storage key:', CHATTOOL_STORAGE_KEY);
    console.log('ChatTool: index.html uses:', 'sr_comment_settings');

    // ==========================================
    // showGift オーバーライド（コメント欄に統合表示）
    // ==========================================
    // ユーザーIDごとのセッション管理変数 (20秒以内の連投をまとめる)
    if (typeof window.userGiftSessions === 'undefined') {
        window.userGiftSessions = {}; // { userId: { elementId, lastUpdated, totalPoints, userName, avatarId, gifts: { giftId: { count, elementId } } } }
    }

    // ギフトポイント計算関数 (index.htmlと同様のロジック)
    function calculateGiftPoints(giftId, count, isFree, basePoint) {
        // 個数による倍率テーブル
        const quantityMultipliers = {
            1: 1.00,
            2: 1.04,
            3: 1.06,
            4: 1.08,
            5: 1.10,
            6: 1.12,
            7: 1.14,
            8: 1.16,
            9: 1.18,
            10: 1.20
        };

        // 個数倍率を取得（10個超える場合は1.2倍固定）
        const quantityMultiplier = count <= 10 ? quantityMultipliers[count] : 1.20;

        let totalPoints = 0;

        if (isFree) {
            // 無料ギフトの計算
            const isStar = (giftId === 3000421 || giftId === 800094);

            if (isStar) {
                // 無料ギフト☆: 基本ポイント × 個数 × 倍率
                totalPoints = basePoint * count * quantityMultiplier;
            } else {
                // 無料ギフト（その他）: 基本ポイント × 個数 × 倍率
                totalPoints = basePoint * count * quantityMultiplier;

                // ギフトID 1601 は追加で2.5倍
                if (giftId === 1601) {
                    totalPoints *= 2.5;
                }
            }
        } else {
            // 有料ギフトの計算
            // 基本G × 2.5 × 個数 × 倍率
            totalPoints = basePoint * 2.5 * count * quantityMultiplier;

            // 500G以上のギフトは×1～×10個すべて1.2倍計算
            if (basePoint >= 500 && count <= 10) {
                totalPoints = basePoint * 2.5 * count * 1.20;
            }
        }

        return Math.floor(totalPoints);
    }

    window.showGift = function (g) {
        console.log('ChatTool: showGift override called', g);

        // ギフトをコメント欄（#comment）に表示
        const container = document.getElementById('comment');
        if (!container) return;

        const giftId = g.g;
        const giftCount = g.n || 1;
        const userId = g.u;
        const userName = g.ac;
        const avatarId = g.av;
        const now = Date.now();

        // ギフトマスターデータから点数情報を取得
        let unitPoint = 0;
        let isFree = true;
        if (window.giftMasterData && window.giftMasterData[giftId]) {
            unitPoint = window.giftMasterData[giftId].point || 0;
            isFree = window.giftMasterData[giftId].free;
        }

        // 今回のギフトのポイントを計算
        const pointsThisThrow = calculateGiftPoints(giftId, giftCount, isFree, unitPoint);

        // 合算ギフトポイント（全体）を更新
        if (typeof window.sessionTotalGiftPoints !== 'undefined') {
            window.sessionTotalGiftPoints += pointsThisThrow;
            const sessionPointsEl = document.getElementById("sessionGiftPointsValue");
            if (sessionPointsEl) {
                sessionPointsEl.textContent = window.sessionTotalGiftPoints.toLocaleString();
            }
        }

        // セッション管理ロジック
        // 同一ユーザーで直近20秒以内の更新があれば既存セッションを使用
        let session = window.userGiftSessions[userId];
        const SESSION_TIMEOUT = 20000; // 20秒

        if (!session || (now - session.lastUpdated > SESSION_TIMEOUT)) {
            // 新しいセッションを作成
            const elementId = `user-gift-session-${userId}-${now}`;
            session = {
                elementId: elementId,
                lastUpdated: now,
                totalPoints: 0,
                userName: userName,
                avatarId: avatarId,
                isFreeSession: isFree, // 最初のギフトでセッションの色を決める（もし混ざったら有料優先などに変更可）
                gifts: {} // giftId: { count, elementId }
            };
            window.userGiftSessions[userId] = session;
        } else {
            // 既存セッション更新
            session.lastUpdated = now;
            session.userName = userName; // 名前更新対応
            session.avatarId = avatarId;
            // もし有料ギフトが含まれたら、セッション全体を有料扱い（黄色）にする
            if (!isFree) {
                session.isFreeSession = false;
            }
        }

        // データの更新
        session.totalPoints += pointsThisThrow;

        if (!session.gifts[giftId]) {
            session.gifts[giftId] = { count: 0 };
        }
        session.gifts[giftId].count += giftCount;

        // UI表示更新
        let sessionDiv = document.getElementById(session.elementId);

        if (sessionDiv) {
            // 既存要素の更新
            // ポイント更新
            // ポイント更新
            const pointSpan = sessionDiv.querySelector('.gift-total-points');
            if (pointSpan) {
                const unit = isFree ? 'pt' : 'SG';
                pointSpan.textContent = `${session.totalPoints.toLocaleString()} pt`;
            }

            // 背景色の更新（無料→有料に変わった場合）
            if (!session.isFreeSession) {
                sessionDiv.style.background = '#fff9c4'; // Paid
                sessionDiv.style.borderLeft = '4px solid #fbc02d';
            }

            // ギフトアイコン/個数の更新
            const giftContainer = sessionDiv.querySelector('.session-gift-container');
            if (giftContainer) {
                const giftUniqueClass = `gift-item-${giftId}`;
                let giftItemSpan = giftContainer.querySelector(`.${giftUniqueClass}`);

                if (giftItemSpan) {
                    // 既に表示されているギフトならカウント更新
                    const countEl = giftItemSpan.querySelector('.gift-count-inner');
                    if (countEl) {
                        countEl.textContent = `× ${session.gifts[giftId].count}`;
                    }
                    // 最新のギフトを一番左へ移動 (既存のものでも更新されたら左へ)
                    giftContainer.insertBefore(giftItemSpan, giftContainer.firstChild);
                } else {
                    // 新しい種類のギフトなら左側に追加 (prepend)
                    const newGiftHtml = createSingleGiftHtml(giftId, session.gifts[giftId].count, giftUniqueClass);
                    const wrapper = document.createElement('span'); // 文字列から要素作成のためのラッパー
                    wrapper.innerHTML = newGiftHtml;

                    // prependによって左側（前）に追加され、古いものは右側に残る
                    giftContainer.insertBefore(wrapper.firstElementChild, giftContainer.firstChild);
                }
            }

            // 要素を一番上に移動
            container.insertBefore(sessionDiv, container.firstChild);

        } else {
            // 新規作成
            const div = createSessionGiftElement(session, giftId, unitPoint, isFree);
            container.insertBefore(div, container.firstChild);
        }

        // 裏でギフトカラムにも追加（データ保持のため、従来通りの各投稿ごとの保持）
        let targetContainer = null;
        if (!isFree) {
            targetContainer = document.getElementById('paidGift');
        } else if (giftId === 3000421) {
            targetContainer = document.getElementById('freeStar');
        } else {
            targetContainer = document.getElementById('freeOther');
        }

        if (targetContainer) {
            // 非表示だが、データ保持のために個別のdivを作成
            const hiddenDiv = document.createElement('div');
            hiddenDiv.style.display = 'none';
            hiddenDiv.textContent = `${userName}: ${giftId} x ${giftCount}`;
            targetContainer.insertBefore(hiddenDiv, targetContainer.firstChild);
        }
    };

    // 単体のギフトHTML生成（アイコン＋個数＋単価）
    function createSingleGiftHtml(giftId, count, uniqueClass) {
        let unitText = '';
        if (window.giftMasterData && window.giftMasterData[giftId]) {
            const gift = window.giftMasterData[giftId];
            const unit = gift.free ? 'pt' : 'SG';
            unitText = `@ ${gift.point.toLocaleString()} ${unit}`;
        }

        return `
            <span class="${uniqueClass}" style="display:inline-flex; flex-direction:column; align-items:center; margin-right:8px;">
                <span style="display:flex; align-items:center;">
                    <img src="https://static.showroom-live.com/image/gift/${giftId}_s.png?v=7" style="height:1.3em; width:auto; margin-right:3px;">
                    <span class="gift-count-inner" style="font-weight:bold; font-size:1.1em; color:#FF6F00;">× ${count}</span>
                </span>
                <span style="font-size:0.75em; color:#666; margin-top:-2px;">${unitText}</span>
            </span>
        `;
    }

    // セッションギフト要素を作成する関数
    function createSessionGiftElement(session, initialGiftId, argUnitPoint, argIsFree) {
        const div = document.createElement('div');
        div.id = session.elementId;
        div.classList.add("aggregated-gift-session"); // 表示トグル用のクラス追加
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.alignItems = 'center';
        div.style.marginBottom = '5px';

        // 有料・無料による色分け
        if (session.isFreeSession) {
            div.style.background = '#e8f5e9'; // 薄い緑色 (Free)
            div.style.borderLeft = '4px solid #4CAF50';
        } else {
            div.style.background = '#fff9c4'; // 黄色っぽく (Paid)
            div.style.borderLeft = '4px solid #fbc02d';
        }

        div.style.padding = '4px 8px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '1px 1px 3px #aaa';
        div.style.cursor = 'pointer';

        // アバター画像
        const avatar = document.createElement('img');
        avatar.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${session.avatarId}.png`;
        avatar.style.width = '40px';
        avatar.style.height = '40px';
        avatar.style.marginRight = '8px';
        avatar.style.flexShrink = '0';
        avatar.style.borderRadius = '50%';
        div.appendChild(avatar);

        // コンテンツラッパー
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        contentWrapper.style.flex = '1';
        contentWrapper.style.overflow = 'hidden';
        contentWrapper.style.alignItems = 'flex-start'; // 左寄せを明示

        // ユーザー名
        const nameDiv = document.createElement('div');
        nameDiv.textContent = session.userName;
        nameDiv.style.color = '#333';
        nameDiv.style.fontSize = '0.9em';
        nameDiv.style.fontWeight = 'bold';
        nameDiv.style.marginBottom = '4px';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.style.textAlign = 'left'; // 左寄せを明示
        contentWrapper.appendChild(nameDiv);

        // ギフト表示エリア（複数ギフト用）
        const giftContainer = document.createElement('div');
        giftContainer.className = 'session-gift-container';
        giftContainer.style.display = 'flex';
        giftContainer.style.alignItems = 'center';
        giftContainer.style.flexWrap = 'wrap';
        giftContainer.style.justifyContent = 'flex-start'; // 左寄せを明示

        // 初期ギフト追加
        const giftUniqueClass = `gift-item-${initialGiftId}`;
        giftContainer.innerHTML = createSingleGiftHtml(initialGiftId, session.gifts[initialGiftId].count, giftUniqueClass);

        contentWrapper.appendChild(giftContainer);
        div.appendChild(contentWrapper);

        // 合計ポイント表示
        const pointDiv = document.createElement('div');
        pointDiv.style.marginLeft = 'auto';
        pointDiv.style.paddingLeft = '8px';
        pointDiv.style.textAlign = 'right';
        pointDiv.style.whiteSpace = 'nowrap';

        const pointSpan = document.createElement('span');
        pointSpan.className = 'gift-total-points';
        pointSpan.style.color = '#e65100';
        pointSpan.style.fontWeight = 'bold';
        pointSpan.style.fontSize = '1.1em';

        // 単価表示（initialGiftId対応）
        // createSessionGiftElementに引数として渡ってきた場合はそれを使うが、
        // 後方互換性のためここでも取得ロジックを入れておく（ただし引数は関数シグネチャ変更が必要）
        // ここでは引数 argUnitPoint, argIsFree を使うように関数定義を変える
        const unit = argIsFree ? 'pt' : 'SG';
        pointSpan.textContent = `${session.totalPoints.toLocaleString()} pt`;

        pointDiv.appendChild(pointSpan);
        div.appendChild(pointDiv);

        // クリックで履歴表示
        div.onclick = () => {
            if (typeof window.showGiftHistory === 'function') {
                window.showGiftHistory(session.userId || Object.keys(window.userGiftSessions).find(key => window.userGiftSessions[key] === session), session.userName);
            }
        };

        return div;
    }

    console.log('ChatTool: showGift override installed');

    // ==========================================
    // showComment オーバーライド（左寄せ確実化）
    // ==========================================
    window.showComment = function (c) {
        console.log('ChatTool: showComment override called', c);

        // Cloudflare連携用データ収集
        if (c.u && c.ac) {
            if (typeof accumulateUserIdentity === 'function') {
                accumulateUserIdentity(c.u, c.ac);
            }
        }

        const container = document.getElementById('comment');
        if (!container) return;

        // "m" プロパティがある場合は特別表示（システムメッセージ、ファンレベルアップなど）
        if (c.m) {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'flex-start';
            div.style.marginBottom = '5px';
            div.style.padding = '5px 10px';
            div.style.borderRadius = '5px';
            div.style.boxShadow = '1px 1px 3px #aaa';
            div.style.cursor = 'pointer';

            // カラーコード(c)がある場合はそれを使用、なければデフォルトのオレンジ
            const colorCode = c.c ? `#${c.c}` : '#ff9800';
            const bgColor = c.c ? `#${c.c}20` : '#fff3e0'; // 20は透明度(約12%)

            div.style.background = bgColor;
            div.style.borderLeft = `4px solid ${colorCode}`;

            const textP = document.createElement('p');
            textP.style.margin = '0';
            textP.style.color = colorCode;
            textP.style.fontWeight = 'bold';
            textP.textContent = c.m;

            div.appendChild(textP);

            // t18メッセージの場合は履歴に保存してクリックイベントを追加
            if (c.t === 18 && typeof t18MessageHistory !== 'undefined') {
                t18MessageHistory.unshift({
                    message: c.m,
                    color: colorCode,
                    time: c.created_at ? new Date(c.created_at * 1000) : new Date()
                });
                // 最大100件まで保持
                if (t18MessageHistory.length > 100) {
                    t18MessageHistory.pop();
                }

                // クリックイベント
                div.onclick = () => {
                    if (typeof showT18Modal === 'function') {
                        showT18Modal();
                    }
                };

                // モーダルが開いている場合はリアルタイム更新
                const modal = document.getElementById('t18Modal');
                if (modal && modal.classList.contains('show')) {
                    if (typeof updateT18ModalContent === 'function') {
                        updateT18ModalContent();
                    }
                }
            }

            // 重複チェック用にコメントを記録
            if (typeof receivedComments !== 'undefined') {
                const commentHash = `${c.u}_${c.m}_${c.created_at || Math.floor(Date.now() / 1000)}`;
                receivedComments.add(commentHash);
            }

            // コメント欄の先頭に追加
            container.insertBefore(div, container.firstChild);
            return;
        }

        // 通常のコメント表示
        // ミュート機能
        if (window.commentSettings && window.commentSettings.muteEnabled && window.commentSettings.muteSymbol) {
            const mutePatterns = window.commentSettings.muteSymbol.split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (c.cm) {
                const isMuted = mutePatterns.some(pattern => c.cm.startsWith(pattern));
                if (isMuted) {
                    return;
                }
            }
        }

        // コメントID生成
        const commentId = `comment_${Date.now()}_${typeof commentCounter !== 'undefined' ? commentCounter++ : Math.random()}`;

        // コメント要素を作成
        const div = document.createElement('div');
        div.id = commentId;
        div.className = 'comment-item';
        div.dataset.u = c.u;
        div.dataset.cm = c.cm;
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.alignItems = 'center';
        div.style.marginBottom = '5px';
        div.style.background = '#f9f9f9';
        div.style.padding = '2px 5px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '1px 1px 3px #aaa';
        div.style.transition = 'background 0.5s';

        // アバター画像
        const avatar = document.createElement('img');
        avatar.src = 'https://image.showroom-cdn.com/showroom-prod/image/avatar/' + c.av + '.png';
        avatar.style.width = '40px';
        avatar.style.height = '40px';
        avatar.style.marginRight = '5px';
        avatar.style.flexShrink = '0';
        avatar.onclick = (e) => {
            e.stopPropagation();
            if (typeof showCommentHistory === 'function') {
                showCommentHistory(c.u, c.ac, c.av);
            }
        };

        // コンテンツラッパー
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        contentWrapper.style.flex = '1';
        contentWrapper.style.alignItems = 'flex-start';

        // ユーザー名行
        const nameSpan = document.createElement('span');
        nameSpan.className = 'comment-name';
        nameSpan.style.color = '#999';
        nameSpan.style.fontSize = '0.9em';
        nameSpan.style.marginBottom = '2px';
        nameSpan.style.textAlign = 'left';
        nameSpan.style.display = 'flex';
        nameSpan.style.justifyContent = 'flex-start';
        nameSpan.style.alignItems = 'center';
        nameSpan.style.width = '100%';

        // ポーリングで補完されたコメントにマーカーを追加
        if (c.fromPolling) {
            const marker = document.createElement('span');
            marker.textContent = '[補完] ';
            marker.style.color = '#ff9800';
            marker.style.fontWeight = 'bold';
            nameSpan.appendChild(marker);
        }

        const nameText = document.createElement('span');
        nameText.textContent = c.ac;
        nameSpan.appendChild(nameText);

        // しおりボタン
        if (typeof bookmarks !== 'undefined') {
            const bookmarkIcon = document.createElement('span');
            bookmarkIcon.textContent = '🔖';
            bookmarkIcon.className = 'bookmark-btn';
            bookmarkIcon.style.marginLeft = 'auto'; // 右寄せ
            // すでにブックマークされているかチェック
            if (bookmarks.some(b => b.u === c.u && b.cm === c.cm)) {
                bookmarkIcon.classList.add('active');
            }
            bookmarkIcon.onclick = (e) => {
                e.stopPropagation();
                if (typeof toggleBookmark === 'function') {
                    toggleBookmark(c, commentId, bookmarkIcon);
                }
            };
            nameSpan.appendChild(bookmarkIcon);
        }

        // コメントテキスト
        const textP = document.createElement('p');
        textP.className = 'comment-text';
        textP.textContent = c.cm;
        textP.style.margin = '0';
        textP.style.textAlign = 'left';
        textP.style.fontSize = window.commentSettings ? window.commentSettings.size + 'px' : '14px';
        textP.style.color = window.commentSettings ? window.commentSettings.color : '#000';

        contentWrapper.appendChild(nameSpan);
        contentWrapper.appendChild(textP);

        div.appendChild(avatar);
        div.appendChild(contentWrapper);

        // コメントをクリック可能に（履歴表示）
        div.onclick = () => {
            if (typeof showCommentHistory === 'function') {
                showCommentHistory(c.u, c.ac, c.av);
            }
        };

        // コメント履歴に追加
        if (typeof commentHistory !== 'undefined') {
            if (!commentHistory[c.u]) {
                commentHistory[c.u] = [];
            }
            commentHistory[c.u].unshift({
                time: c.created_at ? new Date(c.created_at * 1000) : new Date(),
                name: c.ac,
                text: c.cm,
                avatar: c.av
            });
            // 最大100件まで保持
            if (commentHistory[c.u].length > 100) {
                commentHistory[c.u].pop();
            }

            // コメント履歴モーダルが開いている場合、リアルタイム更新
            const commentModal = document.getElementById('commentHistoryModal');
            if (commentModal && commentModal.classList.contains('show')) {
                const currentUserId = commentModal.getAttribute('data-user-id');
                if (currentUserId == c.u) {
                    showCommentHistory(c.u, c.ac, c.av);
                }
            }
        }

        // 重複チェック用にコメントを記録
        if (typeof receivedComments !== 'undefined') {
            const commentHash = `${c.u}_${c.cm}_${c.created_at || Math.floor(Date.now() / 1000)}`;
            receivedComments.add(commentHash);
        }

        // コメントマーカー（赤バー）初期適用
        div.dataset.receivedAt = Date.now();
        div.classList.add('old-gift-border');

        // コメント欄の先頭に追加
        container.insertBefore(div, container.firstChild);
    };

    console.log('ChatTool: showComment override installed');

})();
