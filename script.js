document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const team1Input = document.getElementById('team1');
    const team2Input = document.getElementById('team2');
    const oversInput = document.getElementById('overs');
    const startMatchBtn = document.getElementById('start-match');
    const scoreboard = document.getElementById('scoreboard');
    const battingTeamDisplay = document.getElementById('batting-team');
    const runsDisplay = document.getElementById('runs');
    const wicketsDisplay = document.getElementById('wickets');
    const oversDisplay = document.getElementById('overs-display');
    const runButtons = document.querySelectorAll('.run-btn');
    const extraButtons = document.querySelectorAll('.extra-btn');
    const wicketBtn = document.getElementById('wicket-btn');
    const wicketTypeSelect = document.getElementById('wicket-type');
    const undoBtn = document.getElementById('undo-btn');
    const endInningsBtn = document.getElementById('end-innings');
    const newMatchBtn = document.getElementById('new-match');
    const batsmenTable = document.getElementById('batsmen-table').getElementsByTagName('tbody')[0];
    const bowlersTable = document.getElementById('bowlers-table').getElementsByTagName('tbody')[0];
    const commentaryLog = document.getElementById('commentary-log');


    let matchState = {
        team1: '',
        team2: '',
        totalOvers: 20,
        currentInnings: 1,
        battingTeam: '',
        bowlingTeam: '',
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: {
            wides: 0,
            noballs: 0,
            byes: 0,
            legbyes: 0
        },
        batsmen: [],
        bowlers: [],
        history: [],
        isFirstInnings: true
    };

    // Initialize match
    startMatchBtn.addEventListener('click', startMatch);
    newMatchBtn.addEventListener('click', resetMatch);

    // Scoring controls
    runButtons.forEach(button => {
        button.addEventListener('click', () => addRuns(parseInt(button.dataset.runs)));
    });

    extraButtons.forEach(button => {
        button.addEventListener('click', () => addExtra(button.dataset.extra));
    });

    wicketBtn.addEventListener('click', addWicket);
    undoBtn.addEventListener('click', undoLastAction);
    endInningsBtn.addEventListener('click', endInnings);

    // Functions
    function startMatch() {
        const team1 = team1Input.value.trim();
        const team2 = team2Input.value.trim();
        const overs = parseInt(oversInput.value);

        if (!team1 || !team2) {
            alert('Please enter both team names');
            return;
        }

        if (isNaN(overs) || overs < 1 || overs > 50) {
            alert('Please enter a valid number of overs (1-50)');
            return;
        }

        matchState.team1 = team1;
        matchState.team2 = team2;
        matchState.totalOvers = overs;
        matchState.battingTeam = team1;
        matchState.bowlingTeam = team2;
        matchState.isFirstInnings = true;

        // Add initial batsmen
        addNewBatsman('Batsman 1');
        addNewBatsman('Batsman 2');
        
        // Add initial bowler
        addNewBowler('Bowler 1');

        // Update UI
        battingTeamDisplay.textContent = matchState.battingTeam;
        scoreboard.style.display = 'block';
        updateScoreboard();
        addCommentary('Match started! ' + team1 + ' are batting first against ' + team2);
    }

    function resetMatch() {
        // Reset all inputs
        team1Input.value = '';
        team2Input.value = '';
        oversInput.value = '20';
        
        // Hide scoreboard
        scoreboard.style.display = 'none';
        
        // Reset match state
        matchState = {
            team1: '',
            team2: '',
            totalOvers: 20,
            currentInnings: 1,
            battingTeam: '',
            bowlingTeam: '',
            runs: 0,
            wickets: 0,
            balls: 0,
            extras: {
                wides: 0,
                noballs: 0,
                byes: 0,
                legbyes: 0
            },
            batsmen: [],
            bowlers: [],
            history: [],
            isFirstInnings: true
        };
        
        // Clear tables
        batsmenTable.innerHTML = '';
        bowlersTable.innerHTML = '';
        commentaryLog.innerHTML = '';
    }

    function addRuns(runs) {
        if (matchState.wickets >= 10) {
            addCommentary('All out! Innings over.');
            return;
        }

        // Record previous state for undo
        saveState();

        // Update runs
        matchState.runs += runs;
        
        // Update current batsman
        const striker = getStriker();
        if (striker) {
            striker.runs += runs;
            striker.balls++;
            if (runs === 4) striker.fours++;
            if (runs === 6) striker.sixes++;
        }
        
        // Update current bowler
        const currentBowler = getCurrentBowler();
        if (currentBowler) {
            currentBowler.runs += runs;
            if (runs === 0) currentBowler.maidens++;
        }
        
        // Update balls if not extra
        matchState.balls++;
        
        // Check for over completion
        if (matchState.balls % 6 === 0) {
            addCommentary(`Over ${matchState.balls / 6} completed.`);
            // Switch striker and non-striker if odd number of runs in the over
            // (This would require more complex tracking of runs per over)
        }
        
        updateScoreboard();
        addCommentary(`${runs} run${runs !== 1 ? 's' : ''} scored!`);
    }

    function addExtra(extraType) {
        if (matchState.wickets >= 10) {
            addCommentary('All out! Innings over.');
            return;
        }

        // Record previous state for undo
        saveState();

        // Update extras
        matchState.extras[extraType]++;
        matchState.runs++;
        
        // Update bowler's runs for wides and noballs
        if (extraType === 'wide' || extraType === 'noball') {
            const currentBowler = getCurrentBowler();
            if (currentBowler) {
                currentBowler.runs++;
            }
        }
        
        // Don't count as a ball for wides and noballs
        if (extraType !== 'wide' && extraType !== 'noball') {
            matchState.balls++;
        }
        
        updateScoreboard();
        addCommentary(`${extraType.charAt(0).toUpperCase() + extraType.slice(1)}! 1 extra run.`);
    }

    function addWicket() {
        if (matchState.wickets >= 10) {
            addCommentary('All out! Innings over.');
            return;
        }

        // Record previous state for undo
        saveState();

        // Update wickets
        matchState.wickets++;
        
        // Update batsman
        const striker = getStriker();
        if (striker) {
            striker.out = true;
            striker.modeOfDismissal = wicketTypeSelect.value;
        }
        
        // Update bowler
        const currentBowler = getCurrentBowler();
        if (currentBowler && wicketTypeSelect.value !== 'runout') {
            currentBowler.wickets++;
        }
        
        // Update balls
        matchState.balls++;
        
        // Add new batsman if not all out
        if (matchState.wickets < 10) {
            addNewBatsman(`Batsman ${matchState.batsmen.length + 1}`);
        }
        
        updateScoreboard();
        addCommentary(`Wicket! ${striker?.name || 'Batsman'} is out ${formatDismissal(wicketTypeSelect.value)}`);
        
        if (matchState.wickets >= 10) {
            addCommentary('All out! Innings over.');
        }
    }

    function endInnings() {
        if (matchState.isFirstInnings) {
            // Record previous state for undo
            saveState();
            
            // Switch innings
            matchState.battingTeam = matchState.team2;
            matchState.bowlingTeam = matchState.team1;
            matchState.currentInnings = 2;
            matchState.runs = 0;
            matchState.wickets = 0;
            matchState.balls = 0;
            matchState.extras = { wides: 0, noballs: 0, byes: 0, legbyes: 0 };
            matchState.batsmen = [];
            matchState.bowlers = [];
            matchState.isFirstInnings = false;
            
            // Add new batsmen and bowlers
            addNewBatsman('Batsman 1');
            addNewBatsman('Batsman 2');
            addNewBowler('Bowler 1');
            
            // Update UI
            battingTeamDisplay.textContent = matchState.battingTeam;
            updateScoreboard();
            addCommentary(`Innings break! ${matchState.team2} need ${matchState.runs + 1} runs to win.`);
        } else {
            // Match completed
            addCommentary('Match completed!');
            if (matchState.runs > matchState.history[0].runs) {
                addCommentary(`${matchState.battingTeam} wins by ${10 - matchState.wickets} wickets!`);
            } else if (matchState.runs < matchState.history[0].runs) {
                addCommentary(`${matchState.bowlingTeam} wins by ${matchState.history[0].runs - matchState.runs} runs!`);
            } else {
                addCommentary('Match tied!');
            }
        }
    }

    function addNewBatsman(name) {
        const newBatsman = {
            name: name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            out: false,
            modeOfDismissal: '',
            isStriker: matchState.batsmen.length < 2 // First two batsmen are strikers
        };
        matchState.batsmen.push(newBatsman);
        updateBatsmenTable();
    }

    function addNewBowler(name) {
        const newBowler = {
            name: name,
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            isCurrent: matchState.bowlers.length === 0 // First bowler is current
        };
        matchState.bowlers.push(newBowler);
        updateBowlersTable();
    }

    function getStriker() {
        return matchState.batsmen.find(batsman => batsman.isStriker && !batsman.out);
    }

    function getCurrentBowler() {
        return matchState.bowlers.find(bowler => bowler.isCurrent);
    }

    function updateScoreboard() {
        runsDisplay.textContent = matchState.runs;
        wicketsDisplay.textContent = matchState.wickets;
        
        // Calculate overs (e.g., 3.2 means 3 overs and 2 balls)
        const overs = Math.floor(matchState.balls / 6);
        const balls = matchState.balls % 6;
        oversDisplay.textContent = balls === 0 ? overs.toString() : `${overs}.${balls}`;
        
        updateBatsmenTable();
        updateBowlersTable();
    }

    function updateBatsmenTable() {
        batsmenTable.innerHTML = '';
        
        matchState.batsmen.forEach(batsman => {
            const row = batsmenTable.insertRow();
            
            // Name with asterisk if striker
            const nameCell = row.insertCell();
            nameCell.textContent = batsman.name + (batsman.isStriker && !batsman.out ? '*' : '');
            if (batsman.out) nameCell.style.textDecoration = 'line-through';
            
            // Runs
            row.insertCell().textContent = batsman.runs;
            
            // Balls
            row.insertCell().textContent = batsman.balls;
            
            // 4s
            row.insertCell().textContent = batsman.fours;
            
            // 6s
            row.insertCell().textContent = batsman.sixes;
            
            // Strike rate
            const sr = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(2) : '0.00';
            row.insertCell().textContent = sr;
            
            // Dismissal if out
            if (batsman.out) {
                const lastCell = row.insertCell();
                lastCell.textContent = formatDismissal(batsman.modeOfDismissal);
                lastCell.colSpan = 1;
            }
        });
    }

    function updateBowlersTable() {
        bowlersTable.innerHTML = '';
        
        matchState.bowlers.forEach(bowler => {
            const row = bowlersTable.insertRow();
            
            // Name with asterisk if current
            const nameCell = row.insertCell();
            nameCell.textContent = bowler.name + (bowler.isCurrent ? '*' : '');
            
            // Overs (e.g., 3.2 means 3 overs and 2 balls)
            const overs = Math.floor((bowler.maidens + bowler.runs) / 6); // Simplified
            const balls = (bowler.maidens + bowler.runs) % 6;
            row.insertCell().textContent = balls === 0 ? overs.toString() : `${overs}.${balls}`;
            
            // Maidens (placeholder - would need proper tracking)
            row.insertCell().textContent = bowler.maidens;
            
            // Runs conceded
            row.insertCell().textContent = bowler.runs;
            
            // Wickets
            row.insertCell().textContent = bowler.wickets;
            
            // Economy rate
            const totalBalls = (bowler.maidens + bowler.runs); // Simplified
            const economy = totalBalls > 0 ? ((bowler.runs / totalBalls) * 6).toFixed(2) : '0.00';
            row.insertCell().textContent = economy;
        });
    }

    function addCommentary(text) {
        const entry = document.createElement('div');
        entry.className = 'commentary-entry';
        entry.textContent = `• ${formatOvers()} - ${text}`;
        commentaryLog.insertBefore(entry, commentaryLog.firstChild);
        
        // Keep commentary log to a reasonable size
        if (commentaryLog.children.length > 50) {
            commentaryLog.removeChild(commentaryLog.lastChild);
        }
    }

    function formatOvers() {
        const overs = Math.floor(matchState.balls / 6);
        const balls = matchState.balls % 6;
        return `${overs}.${balls}`;
    }

    function formatDismissal(type) {
        switch(type) {
            case 'bowled': return 'b';
            case 'caught': return 'c';
            case 'lbw': return 'lbw';
            case 'runout': return 'run out';
            case 'stumped': return 'st';
            case 'hitwicket': return 'hit wicket';
            default: return '';
        }
    }

    function saveState() {
        // Create a deep copy of the current state
        const stateCopy = JSON.parse(JSON.stringify(matchState));
        matchState.history.push(stateCopy);
        
        // Limit history size
        if (matchState.history.length > 20) {
            matchState.history.shift();
        }
    }

    function undoLastAction() {
        if (matchState.history.length === 0) {
            addCommentary('Nothing to undo');
            return;
        }
        
        const previousState = matchState.history.pop();
        matchState = previousState;
        
        updateScoreboard();
        addCommentary('Last action undone');
    }
});