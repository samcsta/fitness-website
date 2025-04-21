/**
 * Vytryx Fitness Tracker - Main JavaScript
 * Common functionality shared across pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar toggle
    initSidebar();
    
    // Initialize modals
    initModals();
  });
  
  /**
   * Initialize sidebar functionality
   */
  function initSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
      });
      
      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = sidebarToggle.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
      
      // Set active link based on current path
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.sidebar-nav a');
      
      navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        if (currentPath === linkPath || 
            (linkPath !== '/' && currentPath.startsWith(linkPath))) {
          link.classList.add('active');
        }
      });
    }
  }
  
  /**
   * Initialize modal functionality
   */
  function initModals() {
    // Close modal when clicking the backdrop
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      modal.addEventListener('click', function(event) {
        if (event.target === this) {
          this.style.display = 'none';
        }
      });
    });
    
    // Close modal with ESC key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        modals.forEach(modal => {
          if (modal.style.display === 'flex') {
            modal.style.display = 'none';
          }
        });
      }
    });
  }
  
  /**
   * Format date as YYYY-MM-DD
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Format date in a friendly way
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date string
   */
  function formatFriendlyDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  /**
   * Debounce function to limit function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   * @param {string} targetSelector - CSS selector for target element
   */
  function showError(message, targetSelector) {
    const target = document.querySelector(targetSelector);
    
    if (!target) return;
    
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Remove existing error messages
    const existingErrors = target.querySelectorAll('.error-message');
    existingErrors.forEach(el => el.remove());
    
    // Add new error message
    target.prepend(errorEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   * @param {string} targetSelector - CSS selector for target element
   */
  function showSuccess(message, targetSelector) {
    const target = document.querySelector(targetSelector);
    
    if (!target) return;
    
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    // Remove existing success messages
    const existingMessages = target.querySelectorAll('.success-message');
    existingMessages.forEach(el => el.remove());
    
    // Add new success message
    target.prepend(successEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      successEl.remove();
    }, 5000);
  }
  
  /**
   * Get API data with error handling
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise with data
   */
  async function fetchAPI(url, options = {}) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error (${url}):`, error);
      throw error;
    }
  }
  
  /**
   * Initialize a tooltip
   * @param {HTMLElement} element - Element to attach tooltip to
   * @param {string} text - Tooltip text
   */
  function initTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    element.addEventListener('mouseenter', function() {
      document.body.appendChild(tooltip);
      const rect = element.getBoundingClientRect();
      
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
      tooltip.style.opacity = '1';
    });
    
    element.addEventListener('mouseleave', function() {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 300);
    });
  }