// License validation constants
const DEBUG = true;
const VALID_LICENSE_PREFIX = 'MLTIP-';
const LICENSE_KEY_LENGTH = 25; // Including prefix

// Make license functions globally accessible in debug mode
if (DEBUG) {
    window.VALID_LICENSE_PREFIX = VALID_LICENSE_PREFIX;
    window.LICENSE_KEY_LENGTH = LICENSE_KEY_LENGTH;
    window.generateLicenseKey = generateLicenseKey;
    window.validateLicenseKey = validateLicenseKey;
}

function validateLicenseKey(key) {
    console.log('Validating key:', key);
    
    if (!key) {
        console.log('Key is empty');
        return false;
    }
    
    console.log('Checking prefix. Key starts with:', key.substring(0, 6));
    if (!key.startsWith(VALID_LICENSE_PREFIX)) {
        console.log('Invalid prefix');
        return false;
    }
    
    console.log('Checking length. Key length:', key.length, 'Expected:', LICENSE_KEY_LENGTH);
    if (key.length !== LICENSE_KEY_LENGTH) {
        console.log('Invalid length');
        return false;
    }
    
    // Simple validation - check format and allowed characters
    const licenseBody = key.substring(VALID_LICENSE_PREFIX.length);
    console.log('Checking license body:', licenseBody);
    const validCharsRegex = /^[A-Z0-9]+$/;
    const isValid = validCharsRegex.test(licenseBody);
    console.log('License validation result:', isValid);
    return isValid;
}

function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = VALID_LICENSE_PREFIX;
    
    // Generate random characters
    for (let i = 0; i < LICENSE_KEY_LENGTH - VALID_LICENSE_PREFIX.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        key += char;
    }
    
    return key;
}

// Function to toggle license details visibility
function toggleLicenseDetails() {
    const licenseCollapsed = document.getElementById('licenseCollapsed');
    const licenseDetails = document.getElementById('licenseDetails');
    
    if (licenseDetails.style.display === 'none') {
        licenseCollapsed.style.display = 'none';
        licenseDetails.style.display = 'block';
    } else {
        licenseCollapsed.style.display = 'block';
        licenseDetails.style.display = 'none';
    }
}

// Make toggleLicenseDetails globally accessible
window.toggleLicenseDetails = toggleLicenseDetails;

(function () {
  let dashboardInstance;
  let sheetFilterMap = {};

  tableau.extensions.initializeDialogAsync().then(() => {
    dashboardInstance = tableau.extensions.dashboardContent.dashboard;

    const saveConfigBtn = document.getElementById("save-settings");
    const createFilterBtn = document.getElementById("add-dropdown");
    const filterListContainer = document.getElementById("filters-container");
    const filterColumnHeaders = document.querySelector(".filter-headers");
    const noFiltersMessage = document.getElementById("empty-state");
    const licenseInput = document.getElementById("license-key");
    const licenseStatus = document.getElementById("license-status");
    const configContent = document.getElementById("config-content");
    const licenseCollapsed = document.getElementById("licenseCollapsed");
    const licenseDetails = document.getElementById("licenseDetails");

    if (!saveConfigBtn || !createFilterBtn || !filterListContainer || !filterColumnHeaders || !licenseInput || !licenseStatus || !configContent || !licenseCollapsed || !licenseDetails) {
      console.error("❌ Required DOM elements not found");
      return;
    }

    // Initially hide the headers and disable buttons
    filterColumnHeaders.style.display = 'none';
    saveConfigBtn.disabled = true;
    createFilterBtn.disabled = true;

    // Check for saved license key
    const savedLicenseKey = tableau.extensions.settings.get("licenseKey");
    if (savedLicenseKey) {
      licenseInput.value = savedLicenseKey;
      if (validateLicenseKey(savedLicenseKey)) {
        // Show collapsed view with valid license
        licenseCollapsed.style.display = "block";
        licenseDetails.style.display = "none";
        configContent.style.display = "block";
        saveConfigBtn.disabled = false;
        createFilterBtn.disabled = false;
      } else {
        // Show expanded view with invalid license
        licenseCollapsed.style.display = "none";
        licenseDetails.style.display = "block";
        licenseStatus.textContent = "License invalid";
        licenseStatus.className = "license-status invalid";
        configContent.style.display = "none";
      }
    }

    // Handle license key input
    licenseInput.addEventListener("input", (e) => {
      const key = e.target.value.trim().toUpperCase();
      licenseInput.value = key;
      
      if (validateLicenseKey(key)) {
        // Show collapsed view with valid license
        licenseCollapsed.style.display = "block";
        licenseDetails.style.display = "none";
        configContent.style.display = "block";
        saveConfigBtn.disabled = false;
        createFilterBtn.disabled = false;
      } else {
        // Show expanded view with invalid license
        licenseCollapsed.style.display = "none";
        licenseDetails.style.display = "block";
        licenseStatus.textContent = "License invalid";
        licenseStatus.className = "license-status invalid";
        configContent.style.display = "none";
        saveConfigBtn.disabled = true;
        createFilterBtn.disabled = true;
      }
    });

    let availableFilters = [];
    let availableParameters = [];
    let existingConfig = tableau.extensions.settings.get("config");
    let settingsArray = existingConfig ? JSON.parse(existingConfig) : [];
    
    // Get default values settings
    let defaultValues = tableau.extensions.settings.get("defaultValues");
    let { allSelectedValue, nothingSelectedValue } = defaultValues ? 
        JSON.parse(defaultValues) : 
        { allSelectedValue: ".*", nothingSelectedValue: "^$" };

    // Set initial values in inputs
    document.getElementById("all-selected-value").value = allSelectedValue;
    document.getElementById("nothing-selected-value").value = nothingSelectedValue;

    // Function to update headers visibility
    function toggleHeadersVisibility() {
      const hasFilterRows = filterListContainer.children.length > 0;
      filterColumnHeaders.style.display = hasFilterRows ? 'flex' : 'none';
      noFiltersMessage.style.display = hasFilterRows ? 'none' : 'block';
    }

    dashboardInstance.getParametersAsync().then(parameters => {
      availableParameters = parameters.map(p => p.name);

      let filterPromises = dashboardInstance.worksheets.map(ws =>
        ws.getFiltersAsync().then(filters => {
          filters.forEach(f => {
            sheetFilterMap[f.fieldName] = ws.name;
            if (!availableFilters.includes(f.fieldName)) {
              availableFilters.push(f.fieldName);
            }
          });
        })
      );

      Promise.all(filterPromises).then(() => {
        settingsArray.forEach(setting => {
          createFilterRow(setting.filter, setting.param, setting.allValues);
        });

        toggleHeadersVisibility();

        createFilterBtn.disabled = false;
        createFilterBtn.addEventListener("click", () => {
          createFilterRow();
          toggleHeadersVisibility();
        });

        saveConfigBtn.disabled = false;
        saveConfigBtn.addEventListener("click", () => {
          console.log("✅ Save button clicked");

          // Save the license key
          const licenseKey = licenseInput.value.trim();
          tableau.extensions.settings.set("licenseKey", licenseKey);

          const filterRows = filterListContainer.querySelectorAll(".dropdown-wrapper");
          const updatedConfig = [];

          // Get current default values
          const allSelectedValue = document.getElementById("all-selected-value").value;
          const nothingSelectedValue = document.getElementById("nothing-selected-value").value;

          // Save default values
          tableau.extensions.settings.set("defaultValues", JSON.stringify({
            allSelectedValue,
            nothingSelectedValue
          }));

          filterRows.forEach(row => {
            const filterName = row.querySelector(".filter-dropdown").value;
            const paramName = row.querySelector(".parameter-dropdown").value;
            const includeAll = row.querySelector("input[type=checkbox]")?.checked || false;

            updatedConfig.push({
              filter: filterName,
              param: paramName,
              sheet: sheetFilterMap[filterName],
              allValues: includeAll
            });
          });

          tableau.extensions.settings.set("config", JSON.stringify(updatedConfig));
          
          // Apply current filter values to parameters
          const applyCurrentFilters = async () => {
            try {
              for (const config of updatedConfig) {
                console.log("Processing config:", config);
                
                const worksheet = dashboardInstance.worksheets.find(ws => ws.name === config.sheet);
                if (!worksheet) {
                  console.log(`Worksheet not found for sheet: ${config.sheet}`);
                  continue;
                }

                try {
                  const filters = await worksheet.getFiltersAsync();
                  console.log("Got filters:", filters);
                  
                  const currentFilter = filters.find(f => f.fieldName === config.filter);
                  if (!currentFilter) {
                    console.log(`Filter not found: ${config.filter}`);
                    continue;
                  }
                  
                  console.log("Processing filter:", currentFilter);
                  
                  if (currentFilter.isAllSelected) {
                    if (config.allValues) {
                      const domain = await currentFilter.getDomainAsync(tableau.FilterDomainType.RELEVANT);
                      const combinedValues = domain.values.map(e => e.value).join("|");
                      await updateParameterAsync(config.param, combinedValues);
                    } else {
                      await updateParameterAsync(config.param, allSelectedValue);
                    }
                  } else {
                    // Handle only categorical filters
                    const selectedValues = currentFilter.appliedValues.map(e => e.value);
                    const combinedValues = selectedValues.length === 0 ? 
                      nothingSelectedValue : 
                      selectedValues.join("|");
                    await updateParameterAsync(config.param, combinedValues);
                  }
                } catch (error) {
                  console.error(`Error processing filter ${config.filter}:`, error);
                }
              }
            } catch (error) {
              console.error("Error in applyCurrentFilters:", error);
            }
          };

          const updateParameterAsync = async (paramName, value) => {
            try {
              console.log(`Updating parameter ${paramName} with value ${value}`);
              const parameters = await dashboardInstance.getParametersAsync();
              const parameter = parameters.find(p => p.name === paramName);
              if (parameter && parameter.currentValue.value !== value) {
                await parameter.changeValueAsync(value);
                console.log(`Successfully updated parameter ${paramName}`);
              }
            } catch (error) {
              console.error(`Error updating parameter ${paramName}:`, error);
            }
          };

          // Save settings and apply filters
          tableau.extensions.settings.saveAsync()
            .then(() => applyCurrentFilters())
            .then(() => {
              tableau.extensions.ui.closeDialog("Settings saved and filters applied");
            })
            .catch(error => {
              console.error("Error saving settings or applying filters:", error);
              tableau.extensions.ui.closeDialog("Error occurred while saving");
            });
        });
      });
    });

    function createFilterRow(selectedFilter = "", selectedParam = "", includeAll = false) {
      const rowWrapper = document.createElement("div");
      rowWrapper.className = "dropdown-wrapper";

      const createDropdownElement = (className, options, selected) => {
        const select = document.createElement("select");
        select.className = className;

        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Select an option";
        defaultOption.value = "";
        select.appendChild(defaultOption);

        options.forEach(option => {
          const optionElement = document.createElement("option");
          optionElement.value = option;
          optionElement.textContent = option;
          select.appendChild(optionElement);
        });

        select.value = selected;
        return select;
      };

      const filterDropdownWrapper = document.createElement("div");
      filterDropdownWrapper.className = "dropdown-group";
      filterDropdownWrapper.appendChild(createDropdownElement("filter-dropdown", availableFilters, selectedFilter));

      const paramDropdownWrapper = document.createElement("div");
      paramDropdownWrapper.className = "dropdown-group";
      paramDropdownWrapper.appendChild(createDropdownElement("parameter-dropdown", availableParameters, selectedParam));

      const removeBtn = document.createElement("button");
      removeBtn.className = "delete-button";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        rowWrapper.remove();
        toggleHeadersVisibility();
      });

      rowWrapper.appendChild(filterDropdownWrapper);
      rowWrapper.appendChild(paramDropdownWrapper);
      rowWrapper.appendChild(removeBtn);

      filterListContainer.appendChild(rowWrapper);
    }
  });
})();
