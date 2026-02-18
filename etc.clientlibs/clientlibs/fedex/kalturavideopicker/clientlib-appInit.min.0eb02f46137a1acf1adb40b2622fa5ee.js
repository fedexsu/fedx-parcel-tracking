/**
 * Copyright © 2024 WeCreate, Inc., All Rights Reserved
 * Author: Will Carpenter
 **/
;(function(win) {
    'use strict';

    // check for double loading
	if(win.mavice && win.mavice.kaltura && win.mavice.kaltura.namespace) {
		return;
	}

    var mK = createNamespace('mavice.kaltura', win);
    // add general app functions
    mK.namespace = createNamespace;
    mK.initComponent  = initComponent;
    mK.setInitHandler = setInitHandler;
    mK.triggerSearch = triggerKalturaVideoSearch;
    mK.assignVideoId = assignKalturaVideoId;
    mK.buildCUIDialog = buildCUIDialog;
    mK.serialize = serialize;
    // component initialization registry
    var _compInitRegistry = [];

    //////

    /**
     * Create hierarchy of namespaced objects from root object
     * @param name
     * @param root
     */
    function createNamespace(name, root) {
        var ns = root || window;
        (name || '').split('.').forEach(function(v) {
            if(v.length > 0) {
                ns = ns[v] = ns[v] || {};
            }
        });
        return ns;
    }

    /**
     * Setup up component initialization handler to trigger on initialization event
     * @param component selector
     * @param initHandler
     */
    function setInitHandler(selector, initHandler) {
        _compInitRegistry.push({
            selector: selector,
            handler: initHandler
        });
    }

    /**
     * trigger initialization for components contained in given element
     * @param elementOrSelector DOM element or element selector
     */
    function initComponent(elementOrSelector) {
        var $el = jQuery(elementOrSelector);
        _compInitRegistry.forEach(function(componentInit) {
            var $comp = $el.find(componentInit.selector).not('[data-mavice-init]');
            if($comp.length > 0) {
                $comp.attr('data-mavice-init', 1);
                try {
                    componentInit.handler($comp);
                } catch(e) {
                    console.log('An error occurred initializing component selector ' + componentInit.selector, e);
                }
            }
        });
    }
    
    function buildCUIDialog(Coral, id, heading, body, footer, variant) {
        return new Coral.Dialog().set({
            id: id,
            header: {
              innerHTML: heading
            },
            content: {
              innerHTML: body
            },
            footer: {
                innerHTML: footer
            },
            backdrop: 'modal',
            closable: 'on',
            variant: variant
        });
    }
    
    /**
     * assign video id to our textfield for our picker
     * @param id the id for the video we're selecting
     * 
     */
    function assignKalturaVideoId(id, $) {
        //console.log("***** Attempting to Assign Video Id to Input *****");
        //console.log("Id: " + id);
        if (typeof mK.currentVideoPickerInput !== 'undefined' && mK.currentVideoPickerInput.length > 0) {
            //console.log("***** Input Field is FOUND *****");
            mK.currentVideoPickerInput.val(id);
        }
    }
    
    /**
     * trigger video search for Kaltura Video Picker UI
     * @param searchTerm value, if any, from our search input
     * @param page numerical value of the page of results we are trying to load
     * 
     */
    function triggerKalturaVideoSearch(searchTerm, page, $) {
        var ks = mK.ks,
            pid = mK.pid,
            dialog = mK.videoPickerDialog,
            $dialog = mK.$videoPickerDialogEl,
            output = '',
            pageSize = 5,
            totalPages = page,
            currentPage = page,
            $loader = $('.mK-video-picker-loading-spinner', $dialog),
            $mediaResults = $('.mK-video-picker-results', $dialog),
            $results = $('.mK-video-picker-results-list', $dialog),
            $resultCount = $('.mK-video-picker-results-count', $dialog),
            $resultCountWrapper = $('.mK-video-picker-results-count-wrapper', $dialog),
            $pagination = $('.mK-video-picker-pagination-wrapper', $dialog),
            $searchInput = $('.mK-video-picker-search-input', $dialog),
            $emptySearchText = $('.mK-video-picker-empty-search-text', $dialog);
            
        //console.log("***** Triggering Kaltura Video Search *****");
                  
        if (ks !== '' && pid !== '') {
            var data = {
                "ks": ks,
                // pager
                "pager:objectType": "KalturaPager",
                "pager:pageSize": pageSize,
                "pager:pageIndex": page,
                "service": "elasticsearch_esearch",
                "action": "searchEntry",
                // general 
                "searchParams:objectType": "KalturaESearchEntryParams",

                // high level operator - AND between all conditions
                "searchParams:searchOperator:objectType": "KalturaESearchEntryOperator",
                "searchParams:searchOperator:operator": 1,

                // first condition - entry type = 1 (media clip)
                "searchParams:searchOperator:searchItems:item1:objectType": "KalturaESearchEntryItem",
                "searchParams:searchOperator:searchItems:item1:searchTerm": 1,
                "searchParams:searchOperator:searchItems:item1:itemType": 1,
                "searchParams:searchOperator:searchItems:item1:fieldName": "entry_type",

                // third condition - not operator wrapping condition of is_quiz (i.e. entry is not quiz)
                "searchParams:searchOperator:searchItems:item2:objectType": "KalturaESearchEntryOperator",
                "searchParams:searchOperator:searchItems:item2:operator": 3,
                "searchParams:searchOperator:searchItems:item2:searchItems:item0:objectType": "KalturaESearchEntryItem",
                "searchParams:searchOperator:searchItems:item2:searchItems:item0:itemType": 4,
                "searchParams:searchOperator:searchItems:item2:searchItems:item0:fieldName": "is_quiz",

                // fourth condition - not operator wrapping match on media type 2 image (i.e. do not fetch images)
                "searchParams:searchOperator:searchItems:item3:objectType": "KalturaESearchEntryOperator",
                "searchParams:searchOperator:searchItems:item3:operator": 3,
                "searchParams:searchOperator:searchItems:item3:searchItems:item0:objectType": "KalturaESearchEntryItem",
                "searchParams:searchOperator:searchItems:item3:searchItems:item0:searchTerm": 2,
                "searchParams:searchOperator:searchItems:item3:searchItems:item0:itemType": 1,
                "searchParams:searchOperator:searchItems:item3:searchItems:item0:fieldName": "media_type",
                // order
                "searchParams:orderBy:objectType": "KalturaESearchOrderBy",
                "searchParams:orderBy:orderItems:item0:objectType": "KalturaESearchEntryOrderByItem",
                "searchParams:orderBy:orderItems:item0:sortOrder": "desc",
                "searchParams:orderBy:orderItems:item0:sortField": "created_at"

            };
            if(searchTerm != '') {
                var searchData = {
                    // last condition - keyword match
                    "searchParams:searchOperator:searchItems:item4:objectType": "KalturaESearchUnifiedItem",
                    "searchParams:searchOperator:searchItems:item4:searchTerm": searchTerm,
                    "searchParams:searchOperator:searchItems:item4:itemType": 2

                };
                data = {...searchData, ...data};
            }
            
            $loader.show();
            $pagination.hide();
            $resultCount.text('');
            $emptySearchText.hide();
            $.ajax({
                url: 'https://www.kaltura.com/api_v3/?format=1',
                type: 'POST',
                data: mK.serialize(data),
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                crossDomain: true,
                dataType: 'json',
                success: function (data) {
                    var entries = data,
                        objectType = entries.objectType;
                    $results.html('');
                    $resultCount.text(entries.totalCount);
                    $loader.hide();
                    totalPages = Math.ceil(entries.totalCount/pageSize);
                    if (objectType !== "KalturaAPIException") {
                        if (entries.objects.length > 0) {
                            for(var i in entries.objects) {
                                var a = document.createElement('li');
                                var obj;
                                if(entries.objectType === "KalturaMediaListResponse") {
                                  obj = entries.objects[i];
                                } else {
                                  obj = entries.objects[i].object;
                                }
                                if (typeof obj !== 'undefined' && (typeof obj.id !== 'undefined' && obj.id != 'undefined')) {
                                    a.id = obj.id;
                                    var thumbnail = mK.thumbnailBaseUrl + a.id + "/width/100/height/60/type/3";
                                    a.setAttribute("data-entry-id",obj.id)
                                    a.setAttribute("data-entry-name",obj.name)
                                    a.innerHTML = "<span class='mK-video-picker-result-thumbnail-holder'><img class='mK-video-picker-result-thumbnail' src='" + thumbnail + "'></span><span class='mK-video-picker-result-text'><span class='mK-video-picker-result-name'>" + obj.name + " </span></span><span class='mK-video-picker-result-duration'>Duration: " + new Date(obj.duration * 1000).toISOString().substr(11, 8) + "</span><span class='mK-video-picker-button-container'><button class='coral3-Button coral3-Button--primary mK-video-picker-selection-button' type='button' variant='primary' data-mK-vid='" + obj.id + "'>Select</button></span>";
                                    var $a = $(a);
                                    $('.mK-video-picker-selection-button', $a).on('click', function(e){
                                        var $el = $(this),
                                            id = $el.attr('data-mK-vid');
                                            mK.assignVideoId(id, $);
                                            $('.mK-video-picker_searchInput', $dialog).val('');
                                            $results.html('');
                                            $resultCount.text('');
                                            $searchInput.val('');
                                            dialog.hide();
                                    });
                                    $a.addClass('mK-video-picker-video-item');
                                    $results.append($a);
                                }
                            }
                        
                            buildPagination(totalPages, currentPage, $);
                            $pagination.show();
                        } else {
                            // handle empty search result
                            $emptySearchText.show();
                        }
                    } else {
                        // handle API exception
                        mK.apiErrorDialog.show();
                        mK.apiErrorDialog.center();
                    }
                    
                },
                error: function () {
                    mK.apiErrorDialog.show();
                    mK.apiErrorDialog.center();
                }
            });
            
        } else {
            mK.missingConfigDialog.show();
            mK.missingConfigDialog.center();
        }
        
    }
    
    /**
     * build our pagination
     * @param totalPages total number of pages
     * @param currentPage our current page number
     * 
     */
    function buildPagination(totalPages, currentPage, $) {
        var $dialog = mK.$videoPickerDialogEl,
            $prevBtn = $('.mK-video-picker-pagination-previous-button', $dialog),
            $nextBtn = $('.mK-video-picker-pagination-next-button', $dialog),
            $firstBtn = $('.mK-video-picker-pagination-first-button', $dialog),
            $lastBtn = $('.mK-video-picker-pagination-last-button', $dialog),
            $paginationText = $('.mK-video-picker-pagination-text', $dialog);
        
        $paginationText.text(currentPage + " / " + totalPages);
        $prevBtn.removeAttr('disabled');
        $nextBtn.removeAttr('disabled');
        $firstBtn.removeAttr('disabled');
        $lastBtn.removeAttr('disabled');
        
        $prevBtn.attr("data-mK-targetPg", (parseInt(currentPage) - 1));
        $nextBtn.attr("data-mK-targetPg", (parseInt(currentPage) + 1));
        $prevBtn.attr("data-mK-lastPg", totalPages);
        $nextBtn.attr("data-mK-lastPg", totalPages);
        $firstBtn.attr("data-mK-targetPg", 1);
        $lastBtn.attr("data-mK-targetPg", parseInt(totalPages));
        $firstBtn.attr("data-mK-lastPg", totalPages);
        $lastBtn.attr("data-mK-lastPg", totalPages);
        
        if (parseInt(currentPage) == 1) {
            // disable our previous button & first button
            $prevBtn.attr("disabled", "");
            $firstBtn.attr("disabled", "");
        } 
        if (parseInt(currentPage) == totalPages) {
            // disable our next button & last button
            $nextBtn.attr("disabled", "");
            $lastBtn.attr("disabled", "");
        }
    }
    
    /**
     * serialize an object into a query string
     * @param obj object to serialize
     * 
     */
    function serialize (obj) {
        var str = [];
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        }
        return str.join("&");
    }

})(window);