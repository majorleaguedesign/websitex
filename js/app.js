// --- State & Config ---
let pageElements = [];
let selectedElementId = null;
let isPreviewMode = false;
const apiKey = ""; // Set by environment

// --- DOM Elements ---
const canvas = document.getElementById('builder-canvas');
const viewport = document.getElementById('viewport-wrapper');
const sidebar = document.getElementById('sidebar');
const toast = document.getElementById('toast');

// --- Advanced Widget Templates ---
// Using inline styles for maximum portability in the generated HTML
const widgetTemplates = {
    heading: { 
        type: 'heading', label: 'Heading', 
        content: 'Design Your Vision', 
        color: '#111827', fontSize: '42', textAlign: 'center', marginTop: '0', marginBottom: '16' 
    },
    text: { 
        type: 'text', label: 'Text Block', 
        content: 'Create beautiful websites with drag and drop simplicity. No coding required.', 
        color: '#4b5563', fontSize: '16', textAlign: 'center', marginTop: '0', marginBottom: '24' 
    },
    button: { 
        type: 'button', label: 'Button', 
        content: 'Get Started', 
        bgColor: '#4f46e5', color: '#ffffff', borderRadius: '6', textAlign: 'center', 
        paddingY: '12', paddingX: '32', fontSize: '14'
    },
    image: { 
        type: 'image', label: 'Image', 
        url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', 
        borderRadius: '8', width: '100', textAlign: 'center' 
    },
    card: {
        type: 'card', label: 'Card Component',
        title: 'Feature Card', text: 'This is a great place to highlight a specific feature or service you offer.',
        imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
        bgColor: '#ffffff', borderRadius: '12', shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    hero: {
        type: 'hero', label: 'Hero Section',
        headline: 'Build Something Amazing', subheadline: 'The fastest way to go from idea to reality.',
        bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
        overlayOpacity: '0.7', textColor: '#ffffff', minHeight: '400'
    },
    spacer: { type: 'spacer', label: 'Spacer', height: '50' },
    divider: { type: 'divider', label: 'Divider', color: '#e5e7eb', thickness: '1', width: '100', textAlign: 'center' }
};

// --- Initialization ---

function init() {
    // DOM Elements need to be fetched after load if they weren't found initially
    // However, since we use defer or load at end of body, they should be available.
    // Re-assigning them here just in case this runs before DOM ready (if not using defer correctly)
    
    loadFromStorage();
    setupDragAndDrop();
    setupTabs();
    setupAI();
    
    // Auto-save loop
    setInterval(saveToStorage, 5000);
}

// --- Core Layout Logic ---

function renderCanvas() {
    const canvas = document.getElementById('builder-canvas');
    if (!canvas) return;

    if (pageElements.length === 0) {
        canvas.innerHTML = `
            <div class="canvas-empty-state">
                <i class="fas fa-layer-group text-4xl mb-3 opacity-30"></i>
                <p class="text-sm font-medium">Drag elements here to build</p>
                <p class="text-xs mt-1 opacity-60">or ask AI to generate a layout</p>
            </div>`;
        return;
    }

    canvas.innerHTML = '';
    pageElements.forEach(el => {
        const wrapper = document.createElement('div');
        wrapper.className = `editable-element ${selectedElementId === el.id ? 'active' : ''}`;
        wrapper.dataset.id = el.id;
        
        // Interaction Handlers
        wrapper.onclick = (e) => { 
            if(isPreviewMode) return;
            e.stopPropagation(); 
            selectElement(el.id); 
        };

        // Label
        const label = document.createElement('div');
        label.className = 'element-label';
        label.innerHTML = `${el.label || el.type}`;
        wrapper.appendChild(label);

        // Render Content
        wrapper.innerHTML += getWidgetHTML(el);
        canvas.appendChild(wrapper);
    });
}

function getWidgetHTML(el) {
    // Safe defaults
    const style = (props) => props.map(p => p).join('; ');
    
    switch(el.type) {
        case 'heading':
            return `<h2 style="color: ${el.color}; font-size: ${el.fontSize}px; text-align: ${el.textAlign}; margin-top: ${el.marginTop}px; margin-bottom: ${el.marginBottom}px; font-weight: 800; line-height: 1.2;">${el.content}</h2>`;
        
        case 'text':
            return `<p style="color: ${el.color}; font-size: ${el.fontSize}px; text-align: ${el.textAlign}; margin-top: ${el.marginTop}px; margin-bottom: ${el.marginBottom}px; line-height: 1.6;">${el.content}</p>`;
        
        case 'button':
            return `<div style="text-align: ${el.textAlign}; margin: 10px 0;">
                <button style="background: ${el.bgColor}; color: ${el.color}; border-radius: ${el.borderRadius}px; padding: ${el.paddingY}px ${el.paddingX}px; font-size: ${el.fontSize}px; font-weight: 600; border: none; cursor: pointer; transition: transform 0.1s;">${el.content}</button>
            </div>`;
        
        case 'image':
            return `<div style="text-align: ${el.textAlign}; margin: 10px 0;">
                <img src="${el.url}" style="width: ${el.width}%; border-radius: ${el.borderRadius}px; max-width: 100%; height: auto; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" onerror="this.src='https://via.placeholder.com/800x400?text=No+Image'"/>
            </div>`;

        case 'card':
            return `<div style="background: ${el.bgColor}; border-radius: ${el.borderRadius}px; box-shadow: ${el.shadow}; overflow: hidden; max-width: 400px; margin: 0 auto;">
                <img src="${el.imageUrl}" style="width: 100%; height: 200px; object-fit: cover;">
                <div style="padding: 24px;">
                    <h3 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px;">${el.title}</h3>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">${el.text}</p>
                </div>
            </div>`;

        case 'hero':
            return `<div style="position: relative; min-height: ${el.minHeight}px; background-image: url('${el.bgImage}'); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 8px; overflow: hidden;">
                <div style="position: absolute; inset: 0; background: black; opacity: ${el.overlayOpacity};"></div>
                <div style="position: relative; z-index: 10; padding: 40px; max-width: 800px;">
                    <h1 style="color: ${el.textColor}; font-size: 48px; font-weight: 900; margin-bottom: 16px; line-height: 1.1;">${el.headline}</h1>
                    <p style="color: ${el.textColor}; font-size: 18px; opacity: 0.9;">${el.subheadline}</p>
                </div>
            </div>`;
        
        case 'spacer':
            return `<div style="height: ${el.height}px; width: 100%;"></div>`;
        
        case 'divider':
            return `<div style="text-align: ${el.textAlign}; padding: 10px 0;"><div style="display: inline-block; width: ${el.width}%; border-top: ${el.thickness}px solid ${el.color};"></div></div>`;
        
        default: return '';
    }
}

// --- Property Editor Logic ---

function renderEditorPanel() {
    const panel = document.getElementById('panel-editor');
    const emptyState = document.getElementById('editor-empty');
    const content = document.getElementById('editor-content');
    const propControls = document.getElementById('prop-controls');

    // Ensure Editor Tab is active
    switchTab('style');

    if (!selectedElementId) {
        emptyState.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }

    const el = pageElements.find(e => e.id === selectedElementId);
    if(!el) return; // Safety

    emptyState.classList.add('hidden');
    content.classList.remove('hidden');
    document.getElementById('editing-label').innerText = `Edit ${el.label}`;

    propControls.innerHTML = '';

    // Intelligently generate controls
    Object.keys(el).forEach(key => {
        if (['id', 'type', 'label'].includes(key)) return;

        const group = document.createElement('div');
        group.className = 'space-y-2';

        const label = document.createElement('label');
        label.className = 'text-[11px] text-gray-400 font-bold uppercase tracking-wider block';
        label.innerText = key.replace(/([A-Z])/g, ' $1'); // camelCase to Space
        group.appendChild(label);

        let input;

        // Determines Input Type based on key name or value
        if (key === 'content' || key === 'text' || key === 'subheadline') {
            input = document.createElement('textarea');
            input.rows = 3;
            input.className = 'w-full bg-gray-800 border border-gray-700 rounded-md text-sm text-white p-2 focus:ring-1 focus:ring-brand-500 outline-none';
            input.value = el[key];
            input.oninput = (e) => updateProperty(key, e.target.value);
        
        } else if (key.toLowerCase().includes('color')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center gap-2 bg-gray-800 p-2 rounded-md border border-gray-700';
            
            input = document.createElement('input');
            input.type = 'color';
            input.className = 'w-8 h-8 rounded cursor-pointer border-none bg-transparent';
            input.value = el[key];
            input.oninput = (e) => {
                const textInput = wrapper.querySelector('input[type=text]');
                if(textInput) textInput.value = e.target.value;
                updateProperty(key, e.target.value);
            };

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'bg-transparent text-white text-xs font-mono focus:outline-none flex-1';
            textInput.value = el[key];
            textInput.onchange = (e) => {
                input.value = e.target.value;
                updateProperty(key, e.target.value);
            }

            wrapper.appendChild(input);
            wrapper.appendChild(textInput);
            group.appendChild(wrapper);
            propControls.appendChild(group);
            return; // Special return for color complex input

        } else if (key === 'textAlign') {
            input = document.createElement('div');
            input.className = 'flex bg-gray-800 rounded-md border border-gray-700 p-1';
            ['left', 'center', 'right'].forEach(align => {
                const btn = document.createElement('button');
                btn.className = `flex-1 py-1 rounded text-xs ${el[key] === align ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`;
                btn.innerHTML = `<i class="fas fa-align-${align}"></i>`;
                btn.onclick = () => {
                    updateProperty(key, align);
                    // Refresh to update active state
                    renderEditorPanel(); 
                };
                input.appendChild(btn);
            });

        } else if (['fontSize', 'borderRadius', 'paddingX', 'paddingY', 'marginTop', 'marginBottom', 'width', 'minHeight', 'height', 'thickness', 'overlayOpacity'].includes(key)) {
            // Range Slider + Number Input Combo
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center gap-3';
            
            const range = document.createElement('input');
            range.type = 'range';
            // Determine limits
            range.min = (key === 'overlayOpacity') ? 0 : 0;
            range.max = (key === 'width' || key === 'overlayOpacity') ? (key === 'overlayOpacity' ? 1 : 100) : (key === 'minHeight' ? 800 : 100);
            range.step = (key === 'overlayOpacity') ? 0.1 : 1;
            range.value = el[key];
            range.className = 'flex-1';
            
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.className = 'w-16 bg-gray-800 border border-gray-700 rounded text-xs text-white p-1 text-center';
            numInput.value = el[key];

            range.oninput = (e) => {
                numInput.value = e.target.value;
                updateProperty(key, e.target.value);
            };
            numInput.oninput = (e) => {
                range.value = e.target.value;
                updateProperty(key, e.target.value);
            };

            wrapper.appendChild(range);
            wrapper.appendChild(numInput);
            group.appendChild(wrapper);
            propControls.appendChild(group);
            return;

        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'w-full bg-gray-800 border border-gray-700 rounded-md text-sm text-white p-2 focus:ring-1 focus:ring-brand-500 outline-none';
            input.value = el[key];
            input.oninput = (e) => updateProperty(key, e.target.value);
        }

        if(input) group.appendChild(input);
        propControls.appendChild(group);
    });
}

function updateProperty(key, value) {
    const el = pageElements.find(e => e.id === selectedElementId);
    if (el) {
        el[key] = value;
        renderCanvas();
    }
}

function selectElement(id) {
    selectedElementId = id;
    renderCanvas();
    renderEditorPanel();
}

// Make functions available globally for HTML event handlers
window.deleteSelectedElement = function() {
    if (!selectedElementId) return;
    pageElements = pageElements.filter(el => el.id !== selectedElementId);
    selectedElementId = null;
    renderCanvas();
    renderEditorPanel();
    showToast('Element Deleted', 'Widget removed from page.');
}

// --- Drag and Drop ---

function setupDragAndDrop() {
    const canvas = document.getElementById('builder-canvas');
    const widgets = document.querySelectorAll('.widget-item');
    widgets.forEach(w => {
        w.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', w.dataset.type);
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.querySelector('.canvas-empty-state')?.classList.add('drag-over');
    });
    canvas.addEventListener('dragleave', (e) => {
        canvas.querySelector('.canvas-empty-state')?.classList.remove('drag-over');
    });
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        if (type && widgetTemplates[type]) {
            const newEl = { id: 'el-' + Date.now(), ...JSON.parse(JSON.stringify(widgetTemplates[type])) };
            pageElements.push(newEl);
            renderCanvas();
            selectElement(newEl.id);
            showToast('Widget Added', `Added ${newEl.label} to canvas.`);
        }
    });
}

// --- AI Logic ---

function setupAI() {
    document.getElementById('ai-generate-btn').addEventListener('click', async () => {
        const prompt = document.getElementById('ai-prompt').value;
        if (!prompt) return showToast('Error', 'Please enter a description.', 'error');

        const loading = document.getElementById('ai-loading');
        const btn = document.getElementById('ai-generate-btn');
        
        loading.classList.remove('hidden');
        btn.classList.add('opacity-50', 'pointer-events-none');

        // Construct System Prompt based on known schemas
        const systemPrompt = `Generate a JSON array of website widgets based on the user request.
        Use ONLY these types: ${Object.keys(widgetTemplates).join(', ')}.
        Format: [{"type": "heading", "content": "...", "color": "#HEX", ...props}].
        For 'hero' type, include headline, subheadline, bgImage.
        For 'card' type, include title, text, imageUrl.
        Make the design modern and cohesive.`;

        try {
            // Simulate network delay for UX if API key is missing, otherwise real call
            if (!apiKey) {
                await new Promise(r => setTimeout(r, 2000));
                // Mock Response
                pageElements.push({ id: 'el-'+Date.now(), ...widgetTemplates.heading, content: "Generated by AI" });
                pageElements.push({ id: 'el-'+(Date.now()+1), ...widgetTemplates.text, content: "This is a mock response because no API Key is set in the code." });
            } else {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });
                const data = await response.json();
                let aiWidgets = [];
                try {
                    aiWidgets = JSON.parse(data.candidates[0].content.parts[0].text);
                } catch (jsonError) {
                    console.error("Failed to parse AI response", jsonError);
                    throw new Error("Invalid response from AI");
                }
                
                // Merge properties carefully
                aiWidgets.forEach(w => {
                    const template = widgetTemplates[w.type];
                    if (template) {
                        pageElements.push({ ...template, ...w, id: 'el-'+Math.random().toString(36).substr(2,9) });
                    }
                });
            }
            
            renderCanvas();
            showToast('Success', 'AI layout generated successfully!');
            document.getElementById('ai-prompt').value = '';

        } catch (e) {
            console.error(e);
            showToast('Error', 'AI Generation failed. Try again.', 'error');
        } finally {
            loading.classList.add('hidden');
            btn.classList.remove('opacity-50', 'pointer-events-none');
        }
    });
}

// --- Utilities & UI ---

function switchTab(tabId) {
    ['widgets', 'ai', 'style'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const panel = document.getElementById(`panel-${t}`);
        if (t === tabId) {
            btn.classList.add('active');
            panel.classList.remove('hidden');
        } else {
            btn.classList.remove('active');
            panel.classList.add('hidden');
        }
    });
    
    // Explicitly add click listeners to tabs if not already (logic below in init helps, but this fn is called directly)
}
// Exporting for onclick in HTML
window.switchTab = switchTab;

function setupTabs() {
    ['widgets', 'ai', 'style'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) {
            btn.onclick = () => switchTab(t);
        }
    });
}


function setDevice(mode) {
    const wrapper = document.getElementById('viewport-wrapper');
    wrapper.className = mode; // desktop, tablet, mobile
    
    ['desktop', 'tablet', 'mobile'].forEach(m => {
        document.getElementById(`dev-${m}`).classList.toggle('active', m === mode);
        document.getElementById(`dev-${m}`).classList.toggle('text-white', m === mode);
        document.getElementById(`dev-${m}`).classList.toggle('bg-gray-700', m === mode);
    });
}
window.setDevice = setDevice;

function togglePreview() {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle('preview-mode', isPreviewMode);
    
    const btn = document.getElementById('preview-btn');
    
    if (isPreviewMode) {
        btn.innerHTML = `<i class="fas fa-eye-slash"></i> <span>Edit</span>`;
        btn.classList.add('text-brand-400');
        // Hide selection
        selectedElementId = null;
        renderCanvas();
        // In a real app we might collapse the sidebar, but here we just hide outlines
        showToast('Preview Mode', 'Editing disabled. View as user.');
    } else {
        btn.innerHTML = `<i class="fas fa-eye"></i> <span>Preview</span>`;
        btn.classList.remove('text-brand-400');
        renderCanvas();
    }
}
window.togglePreview = togglePreview;

function clearCanvas() {
    if(confirm('Are you sure you want to clear the entire page?')) {
        pageElements = [];
        selectedElementId = null;
        renderCanvas();
        renderEditorPanel();
        showToast('Cleared', 'Canvas is now empty.');
    }
}
window.clearCanvas = clearCanvas;

function publishSite() {
    // Basic publish simulation
    showToast('Published', 'Your site is live! (Simulation)');
}
window.publishSite = publishSite;

function showToast(title, message, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-msg').innerText = message;
    
    const iconCont = document.getElementById('toast-icon-container');
    const icon = document.getElementById('toast-icon');

    if (type === 'error') {
        iconCont.className = 'bg-red-500/20 text-red-400 w-8 h-8 rounded-full flex items-center justify-center';
        icon.className = 'fas fa-times';
    } else {
        iconCont.className = 'bg-green-500/20 text-green-400 w-8 h-8 rounded-full flex items-center justify-center';
        icon.className = 'fas fa-check';
    }

    t.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// --- Persistence ---

function saveToStorage() {
    localStorage.setItem('flexiBuilder_data', JSON.stringify(pageElements));
}

function loadFromStorage() {
    const data = localStorage.getItem('flexiBuilder_data');
    if (data) {
        try {
            pageElements = JSON.parse(data);
            renderCanvas();
        } catch(e) { console.error('Failed to load save'); }
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
