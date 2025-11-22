document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Small helper to avoid XSS when inserting participant names
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep the placeholder option)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = Math.max(0, (details.max_participants || 0) - (details.participants?.length || 0));

        // Basic card layout; participants will be rendered programmatically to attach handlers safely
        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container"></div>
        `;

        // Render participants list (DOM nodes, not innerHTML) so we can attach data attributes and avoid XSS
        const participantsContainer = activityCard.querySelector('.participants-container');
        if (details.participants && details.participants.length) {
          const participantsDiv = document.createElement('div');
          participantsDiv.className = 'participants';

          const title = document.createElement('strong');
          title.textContent = 'Participants';
          participantsDiv.appendChild(title);

          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          details.participants.forEach(p => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = p;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'participant-remove';
            btn.setAttribute('aria-label', `Remove ${p}`);
            btn.dataset.activity = name;
            btn.dataset.email = p;
            btn.textContent = '🗑';

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
          participantsContainer.appendChild(participantsDiv);
        } else {
          participantsContainer.innerHTML = `<div class="participants empty"><em>No participants yet</em></div>`;
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle remove participant clicks with event delegation
  activitiesList.addEventListener('click', async (event) => {
    if (!event.target.matches('.participant-remove')) return;

    const btn = event.target;
    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await resp.json();
      if (resp.ok) {
        // Show a small success message
        messageDiv.textContent = result.message || 'Removed participant';
        messageDiv.className = 'message success';
        messageDiv.classList.remove('hidden');
        // Refresh activities to update UI
        fetchActivities();
        setTimeout(() => messageDiv.classList.add('hidden'), 3500);
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant';
      messageDiv.className = 'message error';
      messageDiv.classList.remove('hidden');
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      // disable submit to avoid duplicate submissions
      const submitButton = signupForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // refresh activities to show new participant and wait until DOM updated
        await fetchActivities();
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }
      if (submitButton) submitButton.disabled = false;

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
