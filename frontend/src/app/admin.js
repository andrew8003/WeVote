// Admin Dashboard JavaScript

class AdminDashboard {
    constructor() {
        this.isAuthenticated = false;
        this.votersData = [];
        this.statsData = null;
        this.baseURL = 'http://localhost:3000/admin';
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Setup admin user button
        document.getElementById('setupBtn').addEventListener('click', () => {
            this.setupAdminUser();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Load voters button
        document.getElementById('loadVotersBtn').addEventListener('click', () => {
            this.loadVoterDetails();
        });

        // Filter controls
        document.getElementById('voteStatusFilter').addEventListener('change', () => {
            this.filterVoters();
        });

        document.getElementById('constituencyFilter').addEventListener('change', () => {
            this.filterVoters();
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        // Clear previous errors
        errorDiv.style.display = 'none';

        // Validate input
        if (!username || !password) {
            this.showError(errorDiv, 'Please enter both username and password');
            return;
        }

        try {
            console.log('Attempting admin login...');
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (data.success) {
                this.isAuthenticated = true;
                this.showDashboard();
                this.loadDashboardData();
                errorDiv.style.display = 'none';
                console.log('Admin authenticated successfully');
            } else {
                this.showError(errorDiv, data.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(errorDiv, 'Connection error. Please check if the backend server is running on port 3000.');
        }
    }

    async setupAdminUser() {
        const setupBtn = document.getElementById('setupBtn');
        const setupMessage = document.getElementById('setupMessage');
        
        setupBtn.disabled = true;
        setupBtn.textContent = 'Creating...';
        
        try {
            const response = await fetch(`${this.baseURL}/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                setupMessage.textContent = 'Admin user created successfully! You can now login with admin/admin.';
                setupMessage.className = 'setup-message success';
            } else {
                setupMessage.textContent = data.message || 'Admin user already exists or setup failed.';
                setupMessage.className = 'setup-message info';
            }
            
            setupMessage.style.display = 'block';
            
        } catch (error) {
            console.error('Setup error:', error);
            setupMessage.textContent = 'Connection error. Please check if the backend server is running.';
            setupMessage.className = 'setup-message error';
            setupMessage.style.display = 'block';
        } finally {
            setupBtn.disabled = false;
            setupBtn.textContent = 'Setup Admin User';
        }
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    showDashboard() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
    }

    logout() {
        this.isAuthenticated = false;
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showLoading(show = true) {
        document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
    }

    async loadDashboardData() {
        if (!this.isAuthenticated) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.baseURL}/stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: 'admin', password: 'admin' })
            });

            const data = await response.json();

            if (data.success) {
                this.statsData = data;
                this.updateOverviewStats(data.overallStats);
                this.updateConstituencyTable(data.votesByConstituency, data.votersByConstituency);
                this.updateCandidatesTable(data.candidateVotes);
                this.updateConstituencyFilter(data.votersByConstituency);
                this.updateLastUpdated(data.lastUpdated);
            } else {
                console.error('Error loading stats:', data.error);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateOverviewStats(stats) {
        document.getElementById('totalRegistered').textContent = stats.totalRegisteredVoters.toLocaleString();
        document.getElementById('totalVotesCast').textContent = stats.totalVotesCast.toLocaleString();
        document.getElementById('turnoutPercentage').textContent = `${stats.overallTurnoutPercentage}%`;
        document.getElementById('totalConstituencies').textContent = stats.totalConstituencies.toLocaleString();
    }

    updateConstituencyTable(votesData, votersData) {
        const tbody = document.querySelector('#constituencyTable tbody');
        tbody.innerHTML = '';

        // Combine votes and voters data by constituency
        const combinedData = {};
        
        // Add voter data
        votersData.forEach(voter => {
            combinedData[voter.constituency] = {
                ...voter,
                mpVotes: 0,
                councilVotes: 0
            };
        });

        // Add vote data
        votesData.forEach(vote => {
            if (combinedData[vote.constituency]) {
                combinedData[vote.constituency].mpVotes = vote.mpVoteCount || 0;
                combinedData[vote.constituency].councilVotes = vote.councilVoteCount || 0;
            }
        });

        // Sort by constituency
        const sortedData = Object.values(combinedData).sort((a, b) => 
            a.constituency.localeCompare(b.constituency)
        );

        sortedData.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${item.constituency}</strong></td>
                <td>${item.totalRegistered.toLocaleString()}</td>
                <td>${item.totalVoted.toLocaleString()}</td>
                <td><strong>${item.turnoutPercentage}%</strong></td>
                <td>${item.mpVotes.toLocaleString()}</td>
                <td>${item.councilVotes.toLocaleString()}</td>
            `;
        });
    }

    updateCandidatesTable(candidatesData) {
        const tbody = document.querySelector('#candidatesTable tbody');
        tbody.innerHTML = '';

        // Sort by total votes descending
        const sortedCandidates = candidatesData.sort((a, b) => b.totalVotes - a.totalVotes);

        sortedCandidates.forEach(candidate => {
            const constituenciesList = Object.keys(candidate.constituencies)
                .map(constituency => `${constituency}: ${candidate.constituencies[constituency]}`)
                .join(', ');

            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${candidate.candidateId}</strong></td>
                <td><span class="badge badge-${candidate.voteType.toLowerCase()}">${candidate.voteType}</span></td>
                <td><strong>${candidate.totalVotes.toLocaleString()}</strong></td>
                <td class="constituencies-cell">${constituenciesList || 'None'}</td>
            `;
        });
    }

    updateConstituencyFilter(votersData) {
        const filter = document.getElementById('constituencyFilter');
        const constituencies = [...new Set(votersData.map(v => v.constituency))].sort();
        
        // Clear existing options except "All"
        filter.innerHTML = '<option value="all">All Constituencies</option>';
        
        constituencies.forEach(constituency => {
            const option = document.createElement('option');
            option.value = constituency;
            option.textContent = constituency;
            filter.appendChild(option);
        });
    }

    async loadVoterDetails() {
        if (!this.isAuthenticated) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.baseURL}/voters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: 'admin', password: 'admin' })
            });

            const data = await response.json();

            if (data.success) {
                this.votersData = data.voters;
                this.updateVotersTable(this.votersData);
            } else {
                console.error('Error loading voters:', data.error);
            }
        } catch (error) {
            console.error('Error fetching voter details:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateVotersTable(voters) {
        const tbody = document.querySelector('#votersTable tbody');
        tbody.innerHTML = '';

        // Sort by registration date (newest first)
        const sortedVoters = voters.sort((a, b) => 
            new Date(b.registrationDate) - new Date(a.registrationDate)
        );

        sortedVoters.forEach(voter => {
            const registrationDate = new Date(voter.registrationDate).toLocaleDateString();
            const voteTime = voter.voteTimestamp 
                ? new Date(voter.voteTimestamp).toLocaleString() 
                : '-';
            
            const voteStatus = voter.voteCast ? 'Voted' : 'Not Voted';
            const statusClass = voter.voteCast ? 'status-voted' : 'status-not-voted';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td><code>${voter.voterId}</code></td>
                <td><strong>${voter.name}</strong></td>
                <td>${voter.constituency}</td>
                <td>${registrationDate}</td>
                <td><span class="${statusClass}">${voteStatus}</span></td>
                <td>${voteTime}</td>
            `;
        });
    }

    filterVoters() {
        const statusFilter = document.getElementById('voteStatusFilter').value;
        const constituencyFilter = document.getElementById('constituencyFilter').value;

        if (this.votersData.length === 0) return;

        let filteredVoters = this.votersData;

        // Filter by vote status
        if (statusFilter !== 'all') {
            filteredVoters = filteredVoters.filter(voter => {
                if (statusFilter === 'voted') return voter.voteCast;
                if (statusFilter === 'not-voted') return !voter.voteCast;
                return true;
            });
        }

        // Filter by constituency
        if (constituencyFilter !== 'all') {
            filteredVoters = filteredVoters.filter(voter => 
                voter.constituency === constituencyFilter
            );
        }

        this.updateVotersTable(filteredVoters);
    }

    updateLastUpdated(timestamp) {
        const element = document.getElementById('lastUpdated');
        const date = new Date(timestamp);
        element.textContent = date.toLocaleString();
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

// Add some CSS classes dynamically
const style = document.createElement('style');
style.textContent = `
    .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .badge-mp {
        background: #e6fffa;
        color: #234e52;
    }
    
    .badge-local_council {
        background: #fef5e7;
        color: #744210;
    }
    
    .constituencies-cell {
        max-width: 300px;
        font-size: 0.8rem;
        color: #666;
    }
    
    code {
        background: #f7fafc;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        color: #2d3748;
    }
`;
document.head.appendChild(style);
