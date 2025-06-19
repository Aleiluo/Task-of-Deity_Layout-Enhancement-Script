// ==UserScript==
// @name         欲神的任务网页布局调整
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  调整页面布局，包括故事容器位置、关闭下拉菜单、立绘位置和缩放控制
// @author       Aleiluo
// @include      /^https:\/\/taskofdeity\..+\..+\/.*$/
// @license MIT
// ==/UserScript==

(function() {
    'use strict';

    // 配置变量 - 方便修改
    const CONFIG = {
        // 故事容器配置
        STORY_LEFT_MARGIN_PERCENT: 15,     // 故事容器左边距（页面宽度百分比）
        STORY_WIDTH_PERCENT: 60,           // 故事容器宽度（页面宽度百分比）

        // 立绘配置
        CHAR_RIGHT_MARGIN_PERCENT: 10,     // 立绘右边距（页面宽度百分比）
        CHARACTER_SCALE_DEFAULT: 1.4,      // 立绘默认缩放比例

        // 缩放控制器配置
        SLIDER_POSITION_PERCENT: 10,       // 滑块高度位置（从顶部算起的百分比）
        SLIDER_RIGHT_MARGIN: 0.5,          // 滑块距离右侧的距离（百分比）
        SLIDER_LENGTH: 100,                // 滑条的长度（像素）
        LABEL_MARGIN_RIGHT: -10,           // 立绘缩放文字距离滑条的距离（像素）
        SLIDER_STEP: 0.05,                 // 滑块步长
        SLIDER_MIN: 0.5,                   // 最小缩放值
        SLIDER_MAX: 2,                     // 最大缩放值
    };

    // 等待元素出现的辅助函数
    function waitForElement(selector, callback, timeout = 10000) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
            return;
        }

        const startTime = Date.now();
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                callback(element);
            } else if (Date.now() - startTime > timeout) {
                obs.disconnect();
                console.log(`Timeout waiting for element: ${selector}`);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 1. 调整故事容器位置和宽度
    function adjustStoryContainer() {
        waitForElement('#story.container', (storyDiv) => {
            // 只设置必要的样式
            storyDiv.style.marginLeft = `${CONFIG.STORY_LEFT_MARGIN_PERCENT}%`;
            storyDiv.style.width = `${CONFIG.STORY_WIDTH_PERCENT}%`;

            console.log('Story container adjusted');
        });
    }

    // 2. 关闭所有dropdown（排除btn_char）
    function closeDropdowns() {
        const selectors = [
            'details.dropdown.prop_main.w-10.h-10[open]',
            'details#stat_menu_details.dropdown.w-10.h-10.relative[open]',
            'details#btn_equip.dropdown.equip_main.w-10.h-10[open]'
        ];

        // 处理通用的dropdown，但排除btn_char
        const genericDropdowns = document.querySelectorAll('details.dropdown.w-10.h-10[open]');
        genericDropdowns.forEach(element => {
            if (element.id !== 'btn_char') {
                element.removeAttribute('open');
                console.log('Closed generic dropdown (excluding btn_char)');
            }
        });

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.removeAttribute('open');
                console.log(`Closed dropdown: ${selector}`);
            });
        });
    }

    // 3. 创建立绘缩放控制器
    function createScaleController() {
        // 检查是否已存在控制器
        if (document.querySelector('#character-scale-controller')) {
            return;
        }

        // 创建控制器容器
        const controller = document.createElement('div');
        controller.id = 'character-scale-controller';
        controller.style.cssText = `
            position: fixed;
            right: ${CONFIG.SLIDER_RIGHT_MARGIN}%;
            top: ${CONFIG.SLIDER_POSITION_PERCENT}%;
            z-index: 1000;
            display: flex;
            align-items: center;
        `;

        // 创建标签
        const label = document.createElement('div');
        label.textContent = '立绘缩放';
        label.style.cssText = `
            writing-mode: vertical-lr;
            text-orientation: mixed;
            color: #333;
            font-weight: bold;
            font-size: 14px;
            margin-right: ${CONFIG.LABEL_MARGIN_RIGHT}px;
            min-height: ${CONFIG.SLIDER_LENGTH}px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 创建滑块容器
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            height: ${CONFIG.SLIDER_LENGTH}px;
        `;

        // 创建滑块
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = CONFIG.SLIDER_MIN;
        slider.max = CONFIG.SLIDER_MAX;
        slider.step = CONFIG.SLIDER_STEP;
        slider.value = CONFIG.CHARACTER_SCALE_DEFAULT;
        slider.style.cssText = `
            writing-mode: bt-lr;
            -webkit-appearance: slider-vertical;
            width: 20px;
            height: ${CONFIG.SLIDER_LENGTH * 0.8}px;
            background: linear-gradient(to top, #ddd, #bbb);
            outline: none;
            border: 1px solid #333;
            border-radius: 10px;
        `;

        // 创建数值显示
        const valueDisplay = document.createElement('div');
        valueDisplay.textContent = `${CONFIG.CHARACTER_SCALE_DEFAULT.toFixed(2)}`;
        valueDisplay.style.cssText = `
                color: #333;
                font-size: 12px;
                font-weight: bold;
                margin-top: 5px;
                min-width: 40px;
                text-align: center;
            `;

        // 滑块事件监听
        slider.addEventListener('input', function() {
            const scale = parseFloat(this.value);
            applyCharacterScale(scale);
            valueDisplay.textContent = scale.toFixed(2);
        });

        // 组装控制器
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        controller.appendChild(label);
        controller.appendChild(sliderContainer);

        // 添加到页面
        document.body.appendChild(controller);

        console.log('Scale controller created');
    }

    // 4. 调整立绘位置和缩放
    function adjustCharacterDisplay() {
        waitForElement('#btn_char_win', (charWin) => {
            // 设置立绘容器位置 - 右侧竖直居中
            charWin.style.position = 'fixed';
            charWin.style.right = `${CONFIG.CHAR_RIGHT_MARGIN_PERCENT}%`;
            charWin.style.top = '50%';
            charWin.style.transform = 'translateY(-50%)';
            charWin.style.zIndex = '100';

            console.log('Character display positioned');

            // 创建缩放控制器
            createScaleController();

            // 应用初始缩放
            applyCharacterScale(CONFIG.CHARACTER_SCALE_DEFAULT);
        });
    }

    // 应用立绘缩放
    function applyCharacterScale(scale) {
        const charWin = document.querySelector('#btn_char_win');
        const charDiv = document.querySelector('#char');

        if (charWin && charDiv) {
            // 对整个立绘容器应用缩放
            charWin.style.transform = `translateY(-50%) scale(${scale})`;
            charWin.style.transformOrigin = 'center';

            console.log(`Applied scale: ${scale}`);
        }
    }

    // 主初始化函数
    function init() {
        console.log('欲神的任务网页布局调整脚本开始运行');

        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    adjustStoryContainer();
                    closeDropdowns();
                    adjustCharacterDisplay();
                }, 500);
            });
        } else {
            setTimeout(() => {
                adjustStoryContainer();
                closeDropdowns();
                adjustCharacterDisplay();
            }, 500);
        }

        // 监听页面变化，确保在动态加载内容后也能正常工作
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.id === 'btn_char_win' || node.querySelector && node.querySelector('#btn_char_win')) {
                                shouldReapply = true;
                            }
                        }
                    });
                }
            });

            if (shouldReapply) {
                setTimeout(() => {
                    adjustCharacterDisplay();
                }, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    init();
})();