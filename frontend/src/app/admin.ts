import { Component, OnInit, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit, AfterViewInit {
  private isAuthenticated = false;
  private votersData: any[] = [];
  private statsData: any = null;
  private baseURL = 'http://localhost:3000/admin';

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Setup admin user button
    const setupBtn = document.getElementById('setupBtn');
    if (setupBtn) {
      setupBtn.addEventListener('click', () => {
        this.setupAdminUser();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDashboardData();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Load voters button
    const loadVotersBtn = document.getElementById('loadVotersBtn');
    if (loadVotersBtn) {
      loadVotersBtn.addEventListener('click', () => {
        this.loadVoterDetails();
      });
    }

    // Filter controls
    const voteStatusFilter = document.getElementById('voteStatusFilter');
    if (voteStatusFilter) {
      voteStatusFilter.addEventListener('change', () => {
        this.filterVoters();
      });
    }

    const constituencyFilter = document.getElementById('constituencyFilter');
    if (constituencyFilter) {
      constituencyFilter.addEventListener('change', () => {
        this.filterVoters();
      });
    }
  }

  private async handleLogin() {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const errorDiv = document.getElementById('loginError');

    if (!usernameInput || !passwordInput || !errorDiv) return;

    const username = usernameInput.value;
    const password = passwordInput.value;

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

  private async setupAdminUser() {
    const setupBtn = document.getElementById('setupBtn') as HTMLButtonElement;
    const setupMessage = document.getElementById('setupMessage');
    
    if (!setupBtn || !setupMessage) return;

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

  private showError(element: HTMLElement, message: string) {
    element.textContent = message;
    element.style.display = 'block';
  }

  private showDashboard() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
  }

  private logout() {
    this.isAuthenticated = false;
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    if (loginSection) loginSection.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }

  private showLoading(show = true) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  private async loadDashboardData() {
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

  private updateOverviewStats(stats: any) {
    const totalRegistered = document.getElementById('totalRegistered');
    const totalVotesCast = document.getElementById('totalVotesCast');
    const totalVotersTurnout = document.getElementById('totalVotersTurnout');
    const turnoutPercentage = document.getElementById('turnoutPercentage');
    const totalConstituencies = document.getElementById('totalConstituencies');

    if (totalRegistered) totalRegistered.textContent = stats.totalRegisteredVoters.toLocaleString();
    if (totalVotesCast) totalVotesCast.textContent = stats.totalVotesCast.toLocaleString();
    if (totalVotersTurnout) totalVotersTurnout.textContent = stats.totalVotersTurnout.toLocaleString();
    if (turnoutPercentage) turnoutPercentage.textContent = `${stats.overallTurnoutPercentage}%`;
    if (totalConstituencies) totalConstituencies.textContent = stats.totalConstituencies.toLocaleString();
  }

  private updateConstituencyTable(votesData: any[], votersData: any[]) {
    const tbody = document.querySelector('#constituencyTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    // Combine votes and voters data by constituency
    const combinedData: any = {};
    
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
    const sortedData = Object.values(combinedData).sort((a: any, b: any) => 
      a.constituency.localeCompare(b.constituency)
    );

    sortedData.forEach((item: any) => {
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

  private updateCandidatesTable(candidatesData: any[]) {
    const tbody = document.querySelector('#candidatesTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

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

  private updateConstituencyFilter(votersData: any[]) {
    const filter = document.getElementById('constituencyFilter') as HTMLSelectElement;
    if (!filter) return;

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

  private async loadVoterDetails() {
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

  private updateVotersTable(voters: any[]) {
    const tbody = document.querySelector('#votersTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    // Sort by registration date (newest first)
    const sortedVoters = voters.sort((a, b) => 
      new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
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

  private filterVoters() {
    const statusFilter = document.getElementById('voteStatusFilter') as HTMLSelectElement;
    const constituencyFilter = document.getElementById('constituencyFilter') as HTMLSelectElement;

    if (!statusFilter || !constituencyFilter || this.votersData.length === 0) return;

    let filteredVoters = this.votersData;

    // Filter by vote status
    if (statusFilter.value !== 'all') {
      filteredVoters = filteredVoters.filter(voter => {
        if (statusFilter.value === 'voted') return voter.voteCast;
        if (statusFilter.value === 'not-voted') return !voter.voteCast;
        return true;
      });
    }

    // Filter by constituency
    if (constituencyFilter.value !== 'all') {
      filteredVoters = filteredVoters.filter(voter => 
        voter.constituency === constituencyFilter.value
      );
    }

    this.updateVotersTable(filteredVoters);
  }

  private updateLastUpdated(timestamp: string) {
    const element = document.getElementById('lastUpdated');
    if (element) {
      const date = new Date(timestamp);
      element.textContent = date.toLocaleString();
    }
  }
}
