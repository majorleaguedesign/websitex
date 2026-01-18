/**
 * FlexiBuilder Lite - Core Engine
 * A lightweight, Elementor-like page builder.
 */

// --- Constants & Config ---

const WIDGETS = {
    section: { 
        type: 'section', label: 'Section', icon: 'fa-columns', category: 'layout',
        defaultProps: { height: 'min-h-[200px]', bg: 'bg-transparent', padding: 'p-10', boxed: true }
    },
    heading: { 
        type: 'heading', label: 'Heading', icon: 'fa-heading', category: 'basic',
        defaultProps: { text: 'Add Your Heading Text Here', tag: 'h2', align: 'text-center', color: 'text-gray-900', size: 'text-4xl', weight: 'font-bold', margin: 'mb-4' }
    },
    text: { 
        type: 'text', label: 'Text Editor', icon: 'fa-paragraph', category: 'basic',
        defaultProps: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', align: 'text-left', color: 'text-gray-600', size: 'text-base', margin: 'mb-4' }
    },
    button: { 
        type: 'button', label: 'Button', icon: 'fa-mouse', category: 'basic',
        defaultProps: { text: 'Click Here', link: '#', align: 'text-center', variant: 'bg-brand-600', color: 'text-white', size: 'px-8 py-3', radius: 'rounded-md', margin: 'my-4' }
    },
    image: { 
        type: 'image', label: 'Image', icon: 'fa-image', category: 'media',
        defaultProps: { src: 'https://via.placeholder.com/800x600', alt: 'Image', width: 'w-full', radius: 'rounded-lg', shadow: 'shadow-none' }
    },
    video: {
        type: 'video', label: 'Video', icon: 'fa-play', category: 'media',
        defaultProps: { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ratio: 'aspect-video' }
    },
    spacer: {
        type: 'spacer', label: 'Spacer', icon: 'fa-arrows-alt-v', category: 'layout',
        defaultProps: { height: 'h-12' }
    },
    divider: {
        type: 'divider', label: 'Divider', icon: 'fa-minus', category: 'layout',
        defaultProps: { style: 'border-gray-200', width: 'w-full', margin: 'my-6' }
    }
};

// --- State Management ---

class StateManager {
    constructor() {
        this.nodes = []; // Root sections
        this.selectedId = null;
        this.history = [];
        this.historyIndex = -1;
        this.device = 'desktop';
        
        // Initial State
        this.saveState();
    }

    get(id) {
        // Recursive find
        const find = (nodes) => {
            for (let node of nodes) {
                if (node.id === id) return node;
                if (node.children) {
                    const found = find(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return find(this.nodes);
    }

    addSection() {
        this.pushHistory();
        const id = 'sec-' + Date.now();
        const colId = 'col-' + Date.now();
        
        const newSection = {
            id: id,
            type: 'section',
            props: { ...WIDGETS.section.defaultProps },
            children: [
                {
                    id: colId,
                    type: 'column',
                    props: { width: 'w-full' },
                    children: []
                }
            ]
        };
        
        this.nodes.push(newSection);
        Editor.render();
        Editor.select(id);
    }

    addWidget(parentId, type) {
        this.pushHistory();
        const parent = this.get(parentId);
        if (!parent) return;

        const newWidget = {
            id: type + '-' + Date.now(),
            type: type,
            props: { ...WIDGETS[type].defaultProps },
            children: [] // Widgets mostly don't have children in this lite version
        };

        parent.children.push(newWidget);
        Editor.render();
        Editor.select(newWidget.id);
    }

    updateProp(id, key, value) {
        const node = this.get(id);
        if (node) {
            node.props[key] = value;
            Editor.render(); // Re-render to show changes
            // Debounce history push could be added here
        }
    }

    delete(id) {
        this.pushHistory();
        // Helper to remove node from tree
        const remove = (nodes) => {
            const idx = nodes.findIndex(n => n.id === id);
            if (idx > -1) {
                nodes.splice(idx, 1);
                return true;
            }
            for (let node of nodes) {
                if (node.children && remove(node.children)) return true;
            }
            return false;
        };

        remove(this.nodes);
        this.selectedId = null;
        Editor.render();
        Editor.closePropertyPanel();
    }

    // History Logic
    pushHistory() {
        // Remove redo stack
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(JSON.parse(JSON.stringify(this.nodes)));
        this.historyIndex++;
        if (this.history.length > 20) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.nodes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            Editor.render();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.nodes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            Editor.render();
        }
    }
}

const State = new StateManager();

// --- Editor Engine ---

const Editor = {
    init() {
        this.renderSidebar();
        this.render();
        this.initDragAndDrop();
    },

    renderSidebar() {
        // Render widget list in sidebar
        const categories = { layout: [], basic: [], media: [] };
        
        Object.entries(WIDGETS).forEach(([key, w]) => {
            if(key === 'section') return; // Handled by "Add Section" button
            categories[w.category].push(w);
        });

        const mkItem = (w) => `
            <div class="widget-item bg-gray-800 border border-gray-700 hover:border-brand-500 hover:bg-gray-750 p-3 rounded cursor-grab flex flex-col items-center gap-2 transition-all group" draggable="true" data-type="${w.type}">
                <i class="fas ${w.icon} text-xl text-gray-500 group-hover:text-brand-400"></i>
                <span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 group-hover:text-white">${w.label}</span>
            </div>
        `;

        document.getElementById('layout-widgets').innerHTML = categories.layout.map(mkItem).join('');
        document.getElementById('basic-widgets').innerHTML = categories.basic.map(mkItem).join('');
        document.getElementById('media-widgets').innerHTML = categories.media.map(mkItem).join('');

        this.setupSidebarDrag();
    },

    setupSidebarDrag() {
        const draggables = document.querySelectorAll('.widget-item');
        draggables.forEach(el => {
            el.addEventListener('dragstart', e => {
                e.dataTransfer.setData('type', el.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
    },

    initDragAndDrop() {
        // Main Container Sorting (Sections)
        new Sortable(document.getElementById('builder-canvas'), {
            animation: 150,
            handle: '.section-handle', // Only drag via handle
            onEnd: (evt) => {
                // Reorder State.nodes based on evt.oldIndex and evt.newIndex
                const item = State.nodes.splice(evt.oldIndex, 1)[0];
                State.nodes.splice(evt.newIndex, 0, item);
                State.pushHistory();
            }
        });
    },

    // Refresh Sortable on Columns after render
    refreshSortables() {
        const columns = document.querySelectorAll('.builder-column');
        columns.forEach(col => {
            new Sortable(col, {
                group: 'widgets', // Allow dragging between columns
                animation: 150,
                ghostClass: 'bg-brand-100/10',
                onAdd: (evt) => {
                    // Logic for drop from sidebar is handled via 'drop' event listener usually, 
                    // or we can use Sortable's data transfer.
                    // For simplicity in this Lite version, we handle internal reordering here.
                    // External drops are handled by standard DnD listeners below.
                },
                onEnd: (evt) => {
                    const fromColId = evt.from.dataset.id;
                    const toColId = evt.to.dataset.id;
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    
                    // Logic to move widget in State
                    const fromCol = State.get(fromColId);
                    const toCol = State.get(toColId);
                    
                    if (fromCol && toCol) {
                        const item = fromCol.children.splice(oldIndex, 1)[0];
                        toCol.children.splice(newIndex, 0, item);
                        State.pushHistory();
                        // We don't need to re-render here because DOM matches state, 
                        // unless we want to clean up classes
                    }
                }
            });
            
            // Native Drop for Sidebar Items
            col.addEventListener('dragover', e => {
                e.preventDefault();
                col.classList.add('bg-brand-500/10', 'ring-2', 'ring-brand-500', 'ring-inset');
            });
            col.addEventListener('dragleave', e => {
                col.classList.remove('bg-brand-500/10', 'ring-2', 'ring-brand-500', 'ring-inset');
            });
            col.addEventListener('drop', e => {
                e.preventDefault();
                col.classList.remove('bg-brand-500/10', 'ring-2', 'ring-brand-500', 'ring-inset');
                const type = e.dataTransfer.getData('type');
                if (type && WIDGETS[type]) {
                    State.addWidget(col.dataset.id, type);
                }
            });
        });
    },

    render() {
        const canvas = document.getElementById('builder-canvas');
        canvas.innerHTML = '';

        State.nodes.forEach(section => {
            canvas.appendChild(this.renderSection(section));
        });
        
        this.refreshSortables();
    },

    renderSection(node) {
        const el = document.createElement('div');
        el.className = `group relative border-2 border-transparent hover:border-brand-500 transition-colors ${node.props.padding} ${node.props.bg} ${node.props.height} flex flex-col justify-center`;
        el.dataset.id = node.id;
        
        // Selection State
        if (State.selectedId === node.id) {
            el.classList.add('border-brand-500', 'ring-4', 'ring-brand-500/20');
        }

        el.onclick = (e) => { e.stopPropagation(); this.select(node.id); };

        // Handle
        const handle = document.createElement('div');
        handle.className = 'section-handle absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-t cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2';
        handle.innerHTML = `<span>SECTION</span> <i class="fas fa-grip-lines"></i> <i class="fas fa-trash-alt cursor-pointer hover:text-red-200" onclick="State.delete('${node.id}')"></i>`;
        el.appendChild(handle);

        // Content Container
        const container = document.createElement('div');
        container.className = node.props.boxed ? 'container mx-auto px-4 flex flex-wrap' : 'w-full flex flex-wrap';
        
        // Render Columns
        node.children.forEach(col => {
            container.appendChild(this.renderColumn(col));
        });

        el.appendChild(container);
        return el;
    },

    renderColumn(node) {
        const el = document.createElement('div');
        el.className = `builder-column relative p-2 border border-dashed border-transparent hover:border-gray-300 min-h-[50px] ${node.props.width} flex flex-col gap-2 transition-all`;
        el.dataset.id = node.id;
        
        // Empty State Helper
        if (node.children.length === 0) {
            el.classList.add('bg-gray-50/50');
            el.setAttribute('data-empty', 'Drop widgets here');
        }

        node.children.forEach(widget => {
            el.appendChild(this.renderWidget(widget));
        });

        return el;
    },

    renderWidget(node) {
        const el = document.createElement('div');
        el.className = `relative group cursor-pointer`;
        el.onclick = (e) => { e.stopPropagation(); this.select(node.id); };
        
        // Wrapper for hover effects / selection
        const wrapper = document.createElement('div');
        wrapper.className = `widget-wrapper transition-all duration-200 border border-transparent ${State.selectedId === node.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'hover:border-brand-400'}`;
        
        // Edit Controls
        if (State.selectedId === node.id) {
            const controls = document.createElement('div');
            controls.className = 'absolute -top-3 right-0 bg-brand-500 text-white text-[9px] px-2 py-0.5 rounded flex gap-2 z-10';
            controls.innerHTML = `<i class="fas fa-pen"></i> <i class="fas fa-trash-alt cursor-pointer" onclick="State.delete('${node.id}')"></i>`;
            el.appendChild(controls);
        }

        // Generate HTML based on type
        const p = node.props;
        let html = '';

        switch(node.type) {
            case 'heading':
                html = `<${p.tag} class="${p.align} ${p.color} ${p.size} ${p.weight} ${p.margin} leading-tight">${p.text}</${p.tag}>`;
                break;
            case 'text':
                html = `<div class="${p.align} ${p.color} ${p.size} ${p.margin} prose max-w-none">${p.text}</div>`;
                break;
            case 'button':
                html = `<div class="${p.align} ${p.margin}">
                    <a href="${p.link}" class="inline-block ${p.variant} ${p.color} ${p.size} ${p.radius} font-semibold transition-transform hover:scale-105 shadow-md hover:shadow-lg">${p.text}</a>
                </div>`;
                break;
            case 'image':
                html = `<div class="${p.shadow} overflow-hidden ${p.radius}">
                    <img src="${p.src}" alt="${p.alt}" class="${p.width} h-auto object-cover block">
                </div>`;
                break;
            case 'video':
                html = `<div class="${p.ratio} w-full overflow-hidden rounded-lg bg-black">
                    <iframe class="w-full h-full" src="${p.src}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>`;
                break;
            case 'spacer':
                html = `<div class="${p.height}"></div>`;
                break;
            case 'divider':
                html = `<div class="${p.margin} flex items-center justify-center"><div class="${p.width} border-t ${p.style}"></div></div>`;
                break;
        }

        wrapper.innerHTML = html;
        el.appendChild(wrapper);
        return el;
    },

    select(id) {
        State.selectedId = id;
        this.render(); // Re-render to update active classes
        this.openPropertyPanel(id);
        
        // Update Breadcrumbs
        const node = State.get(id);
        if (node) {
            document.getElementById('breadcrumbs').innerText = `Document > ${node.type.toUpperCase()}`;
        }
    },

    // --- Property Panel Logic ---

    openPropertyPanel(id) {
        const node = State.get(id);
        if (!node) return;

        const panel = document.getElementById('panel-editor');
        const title = document.getElementById('editor-title');
        const container = document.getElementById('property-controls');
        
        panel.classList.remove('translate-x-full', 'hidden');
        title.innerText = `Edit ${WIDGETS[node.type]?.label || 'Element'}`;
        
        // Generate Controls
        this.renderControls(node, container);
    },

    closePropertyPanel() {
        document.getElementById('panel-editor').classList.add('translate-x-full');
        State.selectedId = null;
        this.render();
    },

    renderControls(node, container) {
        container.innerHTML = '';
        
        // Helper for control generation
        const addControl = (label, input) => {
            const div = document.createElement('div');
            div.className = 'space-y-1';
            div.innerHTML = `<label class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">${label}</label>`;
            div.appendChild(input);
            container.appendChild(div);
        };

        const createInput = (key, type = 'text', options = []) => {
            let el;
            if (type === 'select') {
                el = document.createElement('select');
                el.className = 'w-full bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 p-2 outline-none focus:border-brand-500';
                options.forEach(opt => {
                    const optEl = document.createElement('option');
                    optEl.value = opt.value;
                    optEl.text = opt.label;
                    if (node.props[key] === opt.value) optEl.selected = true;
                    el.appendChild(optEl);
                });
            } else if (type === 'textarea') {
                el = document.createElement('textarea');
                el.className = 'w-full bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 p-2 outline-none focus:border-brand-500';
                el.rows = 4;
                el.value = node.props[key];
            } else {
                el = document.createElement('input');
                el.type = type;
                el.className = 'w-full bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 p-2 outline-none focus:border-brand-500';
                el.value = node.props[key];
            }
            
            el.oninput = (e) => State.updateProp(node.id, key, e.target.value);
            return el;
        };

        // --- SECTION PROPS ---
        if (node.type === 'section') {
            addControl('Background Color', createInput('bg', 'select', [
                {label: 'Transparent', value: 'bg-transparent'},
                {label: 'White', value: 'bg-white'},
                {label: 'Gray', value: 'bg-gray-100'},
                {label: 'Dark', value: 'bg-gray-900'},
                {label: 'Brand', value: 'bg-brand-600'}
            ]));
            addControl('Height', createInput('height', 'select', [
                {label: 'Fit Screen', value: 'min-h-screen'},
                {label: 'Default', value: 'min-h-[200px]'},
                {label: 'Small', value: 'min-h-[100px]'}
            ]));
            addControl('Content Width', createInput('boxed', 'select', [
                {label: 'Boxed', value: true},
                {label: 'Full Width', value: false}
            ]));
        }

        // --- TYPOGRAPHY ---
        if (['heading', 'text', 'button'].includes(node.type)) {
            addControl('Text Content', createInput('text', node.type === 'text' ? 'textarea' : 'text'));
            addControl('Alignment', createInput('align', 'select', [
                {label: 'Left', value: 'text-left'},
                {label: 'Center', value: 'text-center'},
                {label: 'Right', value: 'text-right'}
            ]));
        }

        if (node.type === 'heading') {
            addControl('HTML Tag', createInput('tag', 'select', [
                {label: 'H1', value: 'h1'}, {label: 'H2', value: 'h2'}, {label: 'H3', value: 'h3'}
            ]));
            addControl('Size', createInput('size', 'select', [
                {label: 'Small', value: 'text-2xl'}, {label: 'Medium', value: 'text-4xl'}, {label: 'Large', value: 'text-6xl'}, {label: 'Huge', value: 'text-8xl'}
            ]));
        }

        // --- IMAGE ---
        if (node.type === 'image') {
            addControl('Image URL', createInput('src'));
            addControl('Border Radius', createInput('radius', 'select', [
                {label: 'None', value: 'rounded-none'}, {label: 'Small', value: 'rounded'}, {label: 'Medium', value: 'rounded-lg'}, {label: 'Full', value: 'rounded-full'}
            ]));
            addControl('Shadow', createInput('shadow', 'select', [
                {label: 'None', value: 'shadow-none'}, {label: 'Soft', value: 'shadow-lg'}, {label: 'Hard', value: 'shadow-2xl'}
            ]));
        }

        // --- BUTTON ---
        if (node.type === 'button') {
            addControl('Link URL', createInput('link'));
            addControl('Color', createInput('variant', 'select', [
                {label: 'Brand', value: 'bg-brand-600 hover:bg-brand-500'}, 
                {label: 'Dark', value: 'bg-gray-800 hover:bg-gray-700'},
                {label: 'Outline', value: 'border-2 border-brand-600 text-brand-600 hover:bg-brand-50'}
            ]));
        }
        
        // --- COMMON MARGIN ---
        if (node.type !== 'section' && node.type !== 'column') {
             addControl('Bottom Spacing', createInput('margin', 'select', [
                {label: 'None', value: 'mb-0'}, {label: 'Small', value: 'mb-4'}, {label: 'Medium', value: 'mb-8'}, {label: 'Large', value: 'mb-16'}
            ]));
        }
    },
    
    // Actions
    addNewSection() {
        State.addSection();
    },

    switchPanel(panel) {
        document.getElementById('panel-elements').style.display = panel === 'elements' ? 'block' : 'none';
        document.querySelectorAll('.panel-tab').forEach(el => el.classList.remove('active', 'border-brand-500', 'text-white'));
        event.currentTarget.classList.add('active', 'border-brand-500', 'text-white');
    },

    setDevice(device) {
        State.device = device;
        const wrapper = document.getElementById('viewport-wrapper');
        wrapper.className = `bg-white shadow-2xl transition-all duration-300 relative flex flex-col min-h-[85vh] mx-auto ${device}`;
        
        // Update Icons
        document.querySelectorAll('.device-btn').forEach(btn => {
            if (btn.dataset.device === device) btn.classList.add('bg-gray-700', 'text-white');
            else btn.classList.remove('bg-gray-700', 'text-white');
        });
    },

    togglePreview() {
        document.body.classList.toggle('preview-mode');
        // Hide UI elements in CSS
    },
    
    publish() {
        // Here we would export HTML
        const html = document.getElementById('builder-canvas').innerHTML;
        console.log('Export HTML:', html);
        alert('Site Updated! (Check console for HTML output)');
    },
    
    undo() { State.undo(); },
    redo() { State.redo(); }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    Editor.init();
});

// Expose to window for inline onclicks
window.Editor = Editor;
window.State = State;
