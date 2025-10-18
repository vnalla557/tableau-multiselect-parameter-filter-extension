"use strict";
!function() {
    let extensionSettings = "",
        settingsArray = [],
        sheetList = [],
        storedParameters = [],
        defaultValues = { allSelectedValue: ".*", nothingSelectedValue: "^$" };

    function initializeSetup() {
        tableau.extensions.ui.displayDialogAsync("./config.html", "", {
            height: 600,
            width: 1000
        }).then(() => {
            settingsArray = JSON.parse(extensionSettings = tableau.extensions.settings.get("config"));
            sheetList = [...new Set(settingsArray.map(setting => setting.sheet))];
            
            // Get default values
            const defaultValuesStr = tableau.extensions.settings.get("defaultValues");
            if (defaultValuesStr) {
                defaultValues = JSON.parse(defaultValuesStr);
            }
            
            tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(parameters => {
                storedParameters = parameters;
            }).then(()=>{
                setupFilterListeners();
            });
        });
    }

    function setupFilterListeners() {
        tableau.extensions.dashboardContent.dashboard.worksheets.forEach(worksheet => {
            if (sheetList.includes(worksheet.name)) {
                worksheet.addEventListener(tableau.TableauEventType.FilterChanged, filterEvent => {
                    filterEvent.getFilterAsync().then(sourceFilter => {
                        let matchedSetting = settingsArray.find(setting => setting.filter === sourceFilter.fieldName && setting.sheet === worksheet.name);
                        if (matchedSetting) {
                            processFilterUpdate(sourceFilter, matchedSetting);
                        }
                    });
                });
            }
        });
    }

    function processFilterUpdate(filter, setting) {
        if (filter.isAllSelected) {
            if (setting.allValues) {
                filter.getDomainAsync(tableau.FilterDomainType.RELEVANT).then(domain => {
                    let combinedValues = domain.values.map(e => e.value).join("|");
                    refreshParameter(setting.param, combinedValues);
                });
            } else {
                refreshParameter(setting.param, defaultValues.allSelectedValue);
            }
        } else {
            // Handle only categorical filters
            const selectedValues = filter.appliedValues.map(e => e.value);
            const combinedValues = selectedValues.length === 0 ? 
                defaultValues.nothingSelectedValue : 
                selectedValues.join("|");
            refreshParameter(setting.param, combinedValues);
        }
    }

    function refreshParameter(paramName, value) {
        console.log("Refresh Parameter");
        if (storedParameters.length === 0) {
            tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(parameters => {
                storedParameters = parameters;
                updateParameterValue(paramName, value);
            });
        } else {
            updateParameterValue(paramName, value);
        }
    }

    function updateParameterValue(paramName, value) {
        let parameter = storedParameters.find(param => param.name === paramName);
        if (parameter && parameter.currentValue.value !== value) {
            parameter.changeValueAsync(value);
        }
    }

    $(document).ready(function() {
        tableau.extensions.initializeAsync({
            configure: initializeSetup
        }).then(() => {
            extensionSettings = tableau.extensions.settings.get("config");
            if (extensionSettings) {
                settingsArray = JSON.parse(extensionSettings);
                sheetList = [...new Set(settingsArray.map(e => e.sheet))];
                tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(parameters => {
                storedParameters = parameters;
            }).then(()=>{
                setupFilterListeners();
            });
            } else {
                initializeSetup();
            }
        });
    });
}();
