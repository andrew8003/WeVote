import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

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
  private constituencyData: any[] = [];
  private candidatesData: any[] = [];
  private mpPartyData: any[] = [];
  private councilPartyData: any[] = [];
  private currentSort = { column: '', direction: 'asc', table: '' };

  constructor(private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('WeVote - Admin Dashboard');
  }

  ngAfterViewInit() {
    this.initializeEventListeners();
    this.initializeSortingListeners();
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

  private initializeSortingListeners() {
    // Remove existing listeners first
    const allHeaders = document.querySelectorAll('th.sortable');
    allHeaders.forEach(header => {
      header.replaceWith(header.cloneNode(true));
    });

    // Add click listeners to sortable headers for constituency table
    const constituencyHeaders = document.querySelectorAll('#constituencyTable th.sortable');
    constituencyHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = e.currentTarget as HTMLElement;
        const column = clickedElement.getAttribute('data-sort');
        if (column) {
          console.log('Sorting constituency table by:', column);
          this.sortTable('constituency', column);
        }
      });
    });

    // Add click listeners to sortable headers for candidates table
    const candidatesHeaders = document.querySelectorAll('#candidatesTable th.sortable');
    candidatesHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = e.currentTarget as HTMLElement;
        const column = clickedElement.getAttribute('data-sort');
        if (column) {
          console.log('Sorting candidates table by:', column);
          this.sortTable('candidates', column);
        }
      });
    });

    // Add click listeners to sortable headers for MP party table
    const mpPartyHeaders = document.querySelectorAll('#mpPartyTable th.sortable');
    mpPartyHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = e.currentTarget as HTMLElement;
        const column = clickedElement.getAttribute('data-sort');
        if (column) {
          console.log('Sorting MP party table by:', column);
          this.sortTable('mpParty', column);
        }
      });
    });

    // Add click listeners to sortable headers for council party table
    const councilPartyHeaders = document.querySelectorAll('#councilPartyTable th.sortable');
    councilPartyHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = e.currentTarget as HTMLElement;
        const column = clickedElement.getAttribute('data-sort');
        if (column) {
          console.log('Sorting council party table by:', column);
          this.sortTable('councilParty', column);
        }
      });
    });
  }

  private sortTable(tableName: string, column: string) {
    // Determine sort direction
    let direction = 'asc';
    if (this.currentSort.table === tableName && this.currentSort.column === column) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    console.log(`Sorting ${tableName} table by ${column} in ${direction} direction`);
    this.currentSort = { table: tableName, column, direction };

    // Update header styling
    this.updateSortHeaders(tableName, column, direction);

    // Sort and re-render the appropriate table
    if (tableName === 'constituency') {
      this.sortAndRenderConstituencyTable(column, direction);
    } else if (tableName === 'candidates') {
      this.sortAndRenderCandidatesTable(column, direction);
    } else if (tableName === 'mpParty') {
      this.sortAndRenderMpPartyTable(column, direction);
    } else if (tableName === 'councilParty') {
      this.sortAndRenderCouncilPartyTable(column, direction);
    }
  }

  private updateSortHeaders(tableName: string, activeColumn: string, direction: string) {
    let tableId = '';
    switch (tableName) {
      case 'constituency': tableId = '#constituencyTable'; break;
      case 'candidates': tableId = '#candidatesTable'; break;
      case 'mpParty': tableId = '#mpPartyTable'; break;
      case 'councilParty': tableId = '#councilPartyTable'; break;
    }
    
    const headers = document.querySelectorAll(`${tableId} th.sortable`);
    
    headers.forEach(header => {
      const column = header.getAttribute('data-sort');
      header.classList.remove('sorted-asc', 'sorted-desc');
      
      if (column === activeColumn) {
        header.classList.add(`sorted-${direction}`);
      }
    });
  }

  private sortAndRenderConstituencyTable(column: string, direction: string) {
    if (!this.constituencyData.length) return;

    const sortedData = [...this.constituencyData].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle different data types
      if (column === 'constituency') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else if (column === 'turnout') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    this.renderConstituencyTable(sortedData);
  }

  private sortAndRenderCandidatesTable(column: string, direction: string) {
    if (!this.candidatesData.length) return;

    const sortedData = [...this.candidatesData].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle different data types
      if (column === 'candidateName' || column === 'party' || column === 'voteType') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      } else if (column === 'totalVotes') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    this.renderCandidatesTable(sortedData);
  }

  private sortAndRenderMpPartyTable(column: string, direction: string) {
    if (!this.mpPartyData.length) return;

    const sortedData = [...this.mpPartyData].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle different data types
      if (column === 'party') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      } else {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    this.renderMpPartyTable(sortedData);
  }

  private sortAndRenderCouncilPartyTable(column: string, direction: string) {
    if (!this.councilPartyData.length) return;

    const sortedData = [...this.councilPartyData].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle different data types
      if (column === 'party') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      } else {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    this.renderCouncilPartyTable(sortedData);
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
        this.updateMpPartyTable(data.mpPartyVotes || []);
        this.updateCouncilPartyTable(data.councilPartyVotes || []);
        this.updateConstituencyFilter(data.votersByConstituency);
        this.updateLastUpdated(data.lastUpdated);
        
        // Reinitialize sorting listeners after DOM update
        setTimeout(() => {
          this.initializeSortingListeners();
        }, 100);
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
    const totalVotersTurnout = document.getElementById('totalVotersTurnout');
    const turnoutPercentage = document.getElementById('turnoutPercentage');

    if (turnoutPercentage) turnoutPercentage.textContent = `${stats.overallTurnoutPercentage}%`;
    if (totalRegistered) totalRegistered.textContent = stats.totalRegisteredVoters.toLocaleString();
    if (totalVotersTurnout) totalVotersTurnout.textContent = stats.totalVotersTurnout.toLocaleString();
  }

  private updateConstituencyTable(votesData: any[], votersData: any[]) {
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

    // Store data for sorting
    this.constituencyData = Object.values(combinedData).map((item: any) => ({
      constituency: item.constituency,
      registered: item.totalRegistered,
      voted: item.totalVoted,
      turnout: parseFloat(item.turnoutPercentage)
    }));

    // Clear any previous sort state and render with default sort
    this.currentSort = { column: '', direction: 'asc', table: '' };
    this.sortAndRenderConstituencyTable('constituency', 'asc');
  }

  private renderConstituencyTable(data: any[]) {
    const tbody = document.querySelector('#constituencyTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach((item: any) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${item.constituency}</strong></td>
        <td>${item.registered.toLocaleString()}</td>
        <td>${item.voted.toLocaleString()}</td>
        <td><strong>${item.turnout}%</strong></td>
      `;
    });
  }

  private updateMpPartyTable(partyData: any[]) {
    // Store data for sorting
    this.mpPartyData = partyData.map(party => ({
      party: party.party,
      totalVotes: party.totalVotes,
      percentage: party.percentage
    }));

    // Initial sort by total votes (descending)
    this.sortAndRenderMpPartyTable('totalVotes', 'desc');
  }

  private renderMpPartyTable(data: any[]) {
    const tbody = document.querySelector('#mpPartyTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach((item: any) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${item.party}</strong></td>
        <td>${item.totalVotes.toLocaleString()}</td>
        <td><strong>${item.percentage}%</strong></td>
      `;
    });
  }

  private updateCouncilPartyTable(partyData: any[]) {
    // Store data for sorting
    this.councilPartyData = partyData.map(party => ({
      party: party.party,
      totalVotes: party.totalVotes,
      percentage: party.percentage
    }));

    // Initial sort by total votes (descending)
    this.sortAndRenderCouncilPartyTable('totalVotes', 'desc');
  }

  private renderCouncilPartyTable(data: any[]) {
    const tbody = document.querySelector('#councilPartyTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach((item: any) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${item.party}</strong></td>
        <td>${item.totalVotes.toLocaleString()}</td>
        <td><strong>${item.percentage}%</strong></td>
      `;
    });
  }

  private updateCandidatesTable(candidatesData: any[]) {
    // Store data for sorting
    this.candidatesData = candidatesData.map(candidate => ({
      candidateName: candidate.candidateName || 'Unknown Candidate',
      party: candidate.party || 'Unknown Party',
      candidateId: candidate.candidateId,
      voteType: candidate.voteType,
      totalVotes: candidate.totalVotes,
      constituencies: candidate.constituencies
    }));

    // Clear any previous sort state and render with default sort
    this.currentSort = { column: '', direction: 'asc', table: '' };
    this.sortAndRenderCandidatesTable('totalVotes', 'desc');
  }

  private renderCandidatesTable(data: any[]) {
    const tbody = document.querySelector('#candidatesTable tbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(candidate => {
      const constituenciesList = Object.keys(candidate.constituencies)
        .map(constituency => `${constituency}: ${candidate.constituencies[constituency]}`)
        .join(', ');

      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${candidate.candidateName}</strong></td>
        <td>${candidate.party}</td>
        <td><code>${candidate.candidateId}</code></td>
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
