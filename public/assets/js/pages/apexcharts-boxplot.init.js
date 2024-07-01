function getChartColorsArray(t){if(null!==document.getElementById(t))return t=document.getElementById(t).getAttribute("data-colors"),(t=JSON.parse(t)).map(function(t){t=t.replace(" ","");return-1==t.indexOf("--")?t:getComputedStyle(document.documentElement).getPropertyValue(t)||void 0})}var options={series:[{type:"boxPlot",data:[{x:"Jan 2015",y:[54,66,69,75,88]},{x:"Jan 2016",y:[43,65,69,76,81]},{x:"Jan 2017",y:[31,39,45,51,59]},{x:"Jan 2018",y:[39,46,55,65,71]},{x:"Jan 2019",y:[29,31,35,39,44]},{x:"Jan 2020",y:[41,49,58,61,67]},{x:"Jan 2021",y:[54,59,66,71,88]}]}],chart:{type:"boxPlot",height:350,toolbar:{show:!1}},title:{text:"Basic BoxPlot Chart",align:"left",style:{fontWeight:500}},plotOptions:{boxPlot:{colors:{upper:(barchartColors=getChartColorsArray("basic_box"))[0],lower:barchartColors[1]}}}},chart=new ApexCharts(document.querySelector("#basic_box"),options),barchartColors=(chart.render(),getChartColorsArray("box_plot")),options={series:[{name:"Box",type:"boxPlot",data:[{x:new Date("2017-01-01").getTime(),y:[54,66,69,75,88]},{x:new Date("2018-01-01").getTime(),y:[43,65,69,76,81]},{x:new Date("2019-01-01").getTime(),y:[31,39,45,51,59]},{x:new Date("2020-01-01").getTime(),y:[39,46,55,65,71]},{x:new Date("2021-01-01").getTime(),y:[29,31,35,39,44]}]},{name:"Outliers",type:"scatter",data:[{x:new Date("2017-01-01").getTime(),y:32},{x:new Date("2018-01-01").getTime(),y:25},{x:new Date("2019-01-01").getTime(),y:64},{x:new Date("2020-01-01").getTime(),y:27},{x:new Date("2020-01-01").getTime(),y:78},{x:new Date("2021-01-01").getTime(),y:15}]}],chart:{type:"boxPlot",height:350,toolbar:{show:!1}},colors:barchartColors,title:{text:"BoxPlot - Scatter Chart",align:"left",style:{fontWeight:500}},xaxis:{type:"datetime",tooltip:{formatter:function(t){return new Date(t).getFullYear()}}},plotOptions:{boxPlot:{colors:{upper:barchartColors[0],lower:barchartColors[1]}}},tooltip:{shared:!1,intersect:!0}};(chart=new ApexCharts(document.querySelector("#box_plot"),options)).render();