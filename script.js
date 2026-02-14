class BlockBlastGame {
    constructor() {
        this.gridSize = 8;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.highScore = localStorage.getItem('blockBlastHighScore') || 0;
        this.blocks = [];
        this.draggedIndex = null;
        this.isDragging = false;
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        this.generateBlocks();
        this.updateHighScore();
        this.setupEventListeners();
        this.render();
    }

    generateBlocks() {
        const shapes = [
            [[1]],
            [[1,1]],
            [[1],[1]],
            [[1,1,1]],
            [[1],[1],[1]],
            [[1,1],[1,1]],
            [[1,1,1,1]],
            [[1,1,1],[1,0,0]],
            [[1,1,1],[0,0,1]],
            [[1,1],[1,0],[1,0]],
            [[1,1,1],[0,1,0]],
        ];

        this.blocks = [];
        for (let i = 0; i < 3; i++) {
            const shape = JSON.parse(JSON.stringify(shapes[Math.floor(Math.random() * shapes.length)]));
            this.blocks.push({ shape });
        }
    }

    canPlace(block, row, col) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= this.gridSize || newCol >= this.gridSize || 
                        newRow < 0 || newCol < 0 || this.grid[newRow][newCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placeBlock(block, row, col) {
        // Размещаем блок в данных
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    this.grid[row + r][col + c] = 1;
                }
            }
        }
        
        // Сразу обновляем отображение поля
        this.renderGrid();
        
        // Анимация появления
        this.animateBlockPlacement(row, col, block);
        
        // Удаляем использованный блок
        this.blocks.splice(this.draggedIndex, 1);
        
        // Обновляем отображение блоков справа
        this.renderBlocks();
        
        // Если блоков меньше 3, генерируем новые и обновляем отображение
        if (this.blocks.length < 3) {
            this.generateBlocks();
            this.renderBlocks();
        }
        
        // Очищаем линии с анимацией и обновляем счёт
        this.clearLinesWithAnimation();
        
        this.draggedIndex = null;
        this.isDragging = false;
        this.hideDraggable();
        
        if (this.checkGameOver()) {
            setTimeout(() => alert('Игра окончена!'), 700);
        }
    }

    animateBlockPlacement(row, col, block) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const cell = document.querySelector(`[data-row="${row + r}"][data-col="${col + c}"]`);
                    if (cell) {
                        cell.style.transform = 'scale(0)';
                        cell.style.transition = 'transform 0.2s ease-out';
                        setTimeout(() => {
                            cell.style.transform = 'scale(1)';
                        }, 10);
                    }
                }
            }
        }
    }

    async clearLinesWithAnimation() {
        const linesToClear = [];
        
        // Находим линии для очистки
        for (let r = 0; r < this.gridSize; r++) {
            if (this.grid[r].every(cell => cell === 1)) {
                linesToClear.push({ type: 'row', index: r });
            }
        }
        
        for (let c = 0; c < this.gridSize; c++) {
            let full = true;
            for (let r = 0; r < this.gridSize; r++) {
                if (!this.grid[r][c]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                linesToClear.push({ type: 'col', index: c });
            }
        }
        
        if (linesToClear.length === 0) {
            return;
        }

        // Пульсация поля
        document.querySelector('.game-grid').classList.add('pulse');
        setTimeout(() => {
            document.querySelector('.game-grid').classList.remove('pulse');
        }, 300);

        // Собираем ячейки для анимации
        const cellsToAnimate = [];
        
        linesToClear.forEach(line => {
            if (line.type === 'row') {
                for (let c = 0; c < this.gridSize; c++) {
                    const cell = document.querySelector(`[data-row="${line.index}"][data-col="${c}"]`);
                    if (cell && cell.classList.contains('filled')) {
                        cellsToAnimate.push(cell);
                    }
                }
            } else {
                for (let r = 0; r < this.gridSize; r++) {
                    const cell = document.querySelector(`[data-row="${r}"][data-col="${line.index}"]`);
                    if (cell && cell.classList.contains('filled')) {
                        cellsToAnimate.push(cell);
                    }
                }
            }
        });

        this.isAnimating = true;
        
        // Анимируем исчезновение
        cellsToAnimate.forEach((cell, i) => {
            setTimeout(() => {
                if (cell && cell.classList.contains('filled')) {
                    if (i % 2 === 0) {
                        cell.classList.add('vanishing');
                    } else {
                        cell.classList.add('flash');
                    }
                }
            }, i * 30);
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Очищаем линии в данных
        linesToClear.forEach(line => {
            if (line.type === 'row') {
                this.grid[line.index].fill(0);
            } else {
                for (let r = 0; r < this.gridSize; r++) {
                    this.grid[r][line.index] = 0;
                }
            }
        });

        // Обновляем счёт
        const linesCount = linesToClear.length;
        this.score += linesCount * 100;
        document.getElementById('score').textContent = this.score;
        this.updateHighScore();
        
        const scoreElement = document.getElementById('score');
        scoreElement.classList.add('pop');
        setTimeout(() => scoreElement.classList.remove('pop'), 300);

        // Перерисовываем сетку
        this.renderGrid();
        this.isAnimating = false;
    }

    renderGrid() {
        const gridEl = document.getElementById('gameGrid');
        const cells = gridEl.children;
        
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (this.grid[row][col]) {
                cell.classList.add('filled');
            } else {
                cell.classList.remove('filled');
            }
            cell.classList.remove('vanishing', 'flash');
        }
    }

    renderBlocks() {
        const blocksEl = document.getElementById('nextBlocks');
        blocksEl.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            const blockEl = document.createElement('div');
            blockEl.className = 'block-preview';
            blockEl.dataset.index = index;
            
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    
                    if (r < block.shape.length && c < block.shape[0].length && block.shape[r][c]) {
                        cell.classList.add('filled');
                    }
                    
                    blockEl.appendChild(cell);
                }
            }
            
            blocksEl.appendChild(blockEl);
        });
        
        // Анимация появления новых блоков
        setTimeout(() => {
            document.querySelectorAll('.block-preview').forEach(el => {
                el.classList.add('new');
                setTimeout(() => el.classList.remove('new'), 300);
            });
        }, 100);
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('blockBlastHighScore', this.highScore);
            
            const highScoreElement = document.getElementById('highScore');
            highScoreElement.classList.add('pop');
            setTimeout(() => highScoreElement.classList.remove('pop'), 300);
        }
        document.getElementById('highScore').textContent = this.highScore;
    }

    checkGameOver() {
        for (let b of this.blocks) {
            for (let r = 0; r <= this.gridSize - b.shape.length; r++) {
                for (let c = 0; c <= this.gridSize - b.shape[0].length; c++) {
                    if (this.canPlace(b, r, c)) return false;
                }
            }
        }
        return true;
    }

    setupEventListeners() {
        document.getElementById('themeSwitch').onclick = () => this.toggleTheme();
        document.getElementById('newGameBtn').onclick = () => this.newGame();
        
        document.getElementById('nextBlocks').addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.stopDrag(e));
        document.getElementById('gameGrid').addEventListener('mouseover', (e) => this.onGridHover(e));
        document.getElementById('gameGrid').addEventListener('mouseout', () => this.clearHighlights());
    }

    startDrag(e) {
        if (this.isAnimating) return;
        
        const blockEl = e.target.closest('.block-preview');
        if (!blockEl) return;
        
        const index = parseInt(blockEl.dataset.index);
        if (isNaN(index)) return;
        
        e.preventDefault();
        this.draggedIndex = index;
        this.isDragging = true;
        this.showDraggable(this.blocks[index], e.clientX, e.clientY);
    }

    onDrag(e) {
        if (!this.isDragging) return;
        this.updateDraggablePosition(e.clientX, e.clientY);
        
        const draggable = document.getElementById('draggableBlock');
        draggable.classList.add('dragging');
        
        const gridRect = document.getElementById('gameGrid').getBoundingClientRect();
        if (e.clientX >= gridRect.left && e.clientX <= gridRect.right && 
            e.clientY >= gridRect.top && e.clientY <= gridRect.bottom) {
            
            const cellSize = gridRect.width / this.gridSize;
            const col = Math.floor((e.clientX - gridRect.left) / cellSize);
            const row = Math.floor((e.clientY - gridRect.top) / cellSize);
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                const block = this.blocks[this.draggedIndex];
                const valid = this.canPlace(block, row, col);
                this.highlightCells(row, col, block, valid);
            }
        } else {
            this.clearHighlights();
        }
    }

    stopDrag(e) {
        if (!this.isDragging || this.draggedIndex === null) return;
        
        document.getElementById('draggableBlock').classList.remove('dragging');
        
        const gridRect = document.getElementById('gameGrid').getBoundingClientRect();
        if (e.clientX >= gridRect.left && e.clientX <= gridRect.right && 
            e.clientY >= gridRect.top && e.clientY <= gridRect.bottom) {
            
            const cellSize = gridRect.width / this.gridSize;
            const col = Math.floor((e.clientX - gridRect.left) / cellSize);
            const row = Math.floor((e.clientY - gridRect.top) / cellSize);
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                const block = this.blocks[this.draggedIndex];
                if (this.canPlace(block, row, col)) {
                    this.placeBlock(block, row, col);
                }
            }
        }
        
        this.isDragging = false;
        this.draggedIndex = null;
        this.hideDraggable();
        this.clearHighlights();
    }

    onGridHover(e) {
        if (!this.isDragging || this.draggedIndex === null) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const block = this.blocks[this.draggedIndex];
        const valid = this.canPlace(block, row, col);
        this.highlightCells(row, col, block, valid);
    }

    highlightCells(startRow, startCol, block, valid) {
        this.clearHighlights();
        
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const row = startRow + r;
                    const col = startCol + c;
                    if (row < this.gridSize && col < this.gridSize) {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell && !cell.classList.contains('filled')) {
                            cell.classList.add(valid ? 'drop-valid' : 'drop-invalid');
                        }
                    }
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('drop-valid', 'drop-invalid');
        });
    }

    showDraggable(block, x, y) {
        const el = document.getElementById('draggableBlock');
        el.innerHTML = '';
        el.classList.remove('hidden');
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (r < block.shape.length && c < block.shape[0].length && block.shape[r][c]) {
                    cell.classList.add('filled');
                }
                
                el.appendChild(cell);
            }
        }
        
        this.updateDraggablePosition(x, y);
    }

    updateDraggablePosition(x, y) {
        const el = document.getElementById('draggableBlock');
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    }

    hideDraggable() {
        document.getElementById('draggableBlock').classList.add('hidden');
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
        const btn = document.getElementById('themeSwitch');
        btn.textContent = document.body.classList.contains('dark-theme') ? '☀️ Светлая' : '🌙 Тёмная';
    }

    newGame() {
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.blocks = [];
        this.generateBlocks();
        this.draggedIndex = null;
        this.isDragging = false;
        this.hideDraggable();
        this.clearHighlights();
        this.updateHighScore();
        document.getElementById('score').textContent = this.score;
        this.render();
    }

    render() {
        // Полностью пересоздаём сетку
        const gridEl = document.getElementById('gameGrid');
        gridEl.innerHTML = '';
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = `cell ${this.grid[r][c] ? 'filled' : ''}`;
                cell.dataset.row = r;
                cell.dataset.col = c;
                gridEl.appendChild(cell);
            }
        }
        
        // Рендерим блоки
        this.renderBlocks();
        
        // Обновляем счёт
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }
}

new BlockBlastGame();